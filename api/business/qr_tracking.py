import asyncio
import hashlib
import hmac
import ipaddress
import os
import uuid
from urllib.parse import quote, unquote, urlsplit, urlunsplit

import requests

from persistence import repo_qr_scan
from persistence.database import sessionScope


DEFAULT_GEOIP_URL = "https://ipapi.co/{ip}/json/"
UNKNOWN_IP = "unknown"


def _first_header(headers: dict[str, str], *names: str) -> str | None:
    for name in names:
        value = headers.get(name)
        if value:
            return value.strip()
    return None


def get_client_ip(headers: dict[str, str], client_host: str | None) -> str:
    forwarded = _first_header(headers, "cf-connecting-ip", "x-real-ip")
    if not forwarded:
        forwarded_for = headers.get("x-forwarded-for", "")
        forwarded = forwarded_for.split(",", 1)[0].strip() or None

    candidate = forwarded or client_host or UNKNOWN_IP
    try:
        return str(ipaddress.ip_address(candidate))
    except ValueError:
        return UNKNOWN_IP


def _hash(value: str) -> str:
    secret = os.environ.get("QR_TRACKING_SECRET") or os.environ.get("JWT_SECRET")
    if not secret:
        raise RuntimeError("QR_TRACKING_SECRET or JWT_SECRET must be configured")
    return hmac.new(secret.encode("utf-8"), value.encode("utf-8"), hashlib.sha256).hexdigest()


def _stored_ip(ip_address: str) -> str:
    if os.environ.get("QR_STORE_RAW_IP", "false").lower() in {"1", "true", "yes"}:
        return ip_address
    return _hash(ip_address)


def _access_url(value: str | None, headers: dict[str, str]) -> str:
    candidate = value or headers.get("referer") or headers.get("origin") or "unknown"
    try:
        parsed = urlsplit(candidate.strip())
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            return "unknown"
        # Fragments never reach a server and can contain transient UI state.
        return urlunsplit((parsed.scheme, parsed.netloc, parsed.path or "/", parsed.query, ""))[:1000]
    except (TypeError, ValueError):
        return "unknown"


def _header_geo(headers: dict[str, str]) -> tuple[str | None, str | None]:
    country = _first_header(
        headers,
        "x-vercel-ip-country",
        "cf-ipcountry",
        "cloudfront-viewer-country",
        "x-appengine-country",
        "x-geo-country",
    )
    city = _first_header(
        headers,
        "x-vercel-ip-city",
        "cloudfront-viewer-city",
        "x-appengine-city",
        "x-geo-city",
    )
    return (
        unquote(country)[:100] if country else None,
        unquote(city)[:100] if city else None,
    )


def _lookup_geoip(ip_address: str) -> tuple[str | None, str | None]:
    try:
        parsed_ip = ipaddress.ip_address(ip_address)
        if not parsed_ip.is_global:
            return None, None
    except ValueError:
        return None, None

    url_template = os.environ.get("QR_GEOIP_URL", DEFAULT_GEOIP_URL).strip()
    if not url_template:
        return None, None

    try:
        response = requests.get(
            url_template.format(ip=quote(ip_address, safe="")),
            timeout=2,
            headers={"Accept": "application/json", "User-Agent": "Speako-QR/1.0"},
        )
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, dict):
            return None, None
        if data.get("error"):
            return None, None
        country = data.get("country_name") or data.get("country") or data.get("country_code")
        city = data.get("city")
        return (
            str(country)[:100] if country else None,
            str(city)[:100] if city else None,
        )
    except (requests.RequestException, ValueError, TypeError, KeyError):
        return None, None


async def record_scan(
    headers: dict[str, str],
    client_host: str | None,
    access_url: str | None = None,
):
    ip_address = get_client_ip(headers, client_host)
    user_agent = (headers.get("user-agent") or "unknown")[:1000]
    fingerprint_hash = _hash(f"{ip_address}\n{user_agent}")
    geo_country, geo_city = _header_geo(headers)

    if not geo_country or not geo_city:
        looked_up_country, looked_up_city = await asyncio.to_thread(_lookup_geoip, ip_address)
        geo_country = geo_country or looked_up_country
        geo_city = geo_city or looked_up_city

    with sessionScope() as db:
        is_unique = await repo_qr_scan.register_visitor(fingerprint_hash, db)
        scan = await repo_qr_scan.create_scan(
            tracking_id=str(uuid.uuid4()),
            access_url=_access_url(access_url, headers),
            ip_address=_stored_ip(ip_address),
            geo_country=geo_country,
            geo_city=geo_city,
            user_agent=user_agent,
            fingerprint_hash=fingerprint_hash,
            is_unique=is_unique,
            db=db,
        )
        return {
            "trackingId": scan.tracking_id,
            "scannedAt": scan.scanned_at.isoformat() if scan.scanned_at else None,
            "isUnique": scan.is_unique,
        }


async def record_redirect_result(tracking_id: str, redirect_result: str) -> bool:
    with sessionScope() as db:
        scan = await repo_qr_scan.update_redirect_result(tracking_id, redirect_result, db)
        return scan is not None
