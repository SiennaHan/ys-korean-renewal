import os
from datetime import datetime, time, timedelta, timezone

from persistence import repo_qr_scan
from persistence.database import sessionScope


KST = timezone(timedelta(hours=9))
UTC = timezone.utc


def _utc_naive(value: datetime) -> datetime:
    return value.astimezone(UTC).replace(tzinfo=None)


def _serialize_scan(scan):
    return {
        "id": scan.id,
        "scannedAt": scan.scanned_at.isoformat() if scan.scanned_at else None,
        "accessUrl": scan.access_url,
        "ipAddress": scan.ip_address,
        "geoCountry": scan.geo_country,
        "geoCity": scan.geo_city,
        "userAgent": scan.user_agent,
        "isUnique": bool(scan.is_unique),
        "redirectResult": scan.redirect_result,
    }


async def get_stats(days: int, limit: int, offset: int):
    now_kst = datetime.now(KST)
    today_kst = datetime.combine(now_kst.date(), time.min, tzinfo=KST)
    period_start_kst = today_kst - timedelta(days=days - 1)
    tomorrow_kst = today_kst + timedelta(days=1)

    period_start_utc = _utc_naive(period_start_kst)
    today_start_utc = _utc_naive(today_kst)
    tomorrow_utc = _utc_naive(tomorrow_kst)

    with sessionScope() as db:
        total_scans = await repo_qr_scan.count_all_scans(db)
        total_visitors = await repo_qr_scan.count_all_visitors(db)
        period = await repo_qr_scan.get_period_summary(
            period_start_utc,
            tomorrow_utc,
            db,
        )
        today_scans = await repo_qr_scan.count_scans_between(
            today_start_utc,
            tomorrow_utc,
            db,
        )
        daily_rows = await repo_qr_scan.get_daily_stats(
            period_start_utc,
            tomorrow_utc,
            db,
        )
        country_rows = await repo_qr_scan.get_country_stats(
            period_start_utc,
            tomorrow_utc,
            10,
            db,
        )
        city_rows = await repo_qr_scan.get_city_stats(
            period_start_utc,
            tomorrow_utc,
            10,
            db,
        )
        access_url_rows = await repo_qr_scan.get_access_url_stats(
            period_start_utc,
            tomorrow_utc,
            10,
            db,
        )
        recent_items, recent_total = await repo_qr_scan.get_recent_scans(
            period_start_utc,
            tomorrow_utc,
            limit,
            offset,
            db,
        )

        daily_by_date = {
            str(row.scan_date): {
                "scans": int(row.scans or 0),
                "uniqueScans": int(row.unique_scans or 0),
            }
            for row in daily_rows
        }
        daily = []
        for index in range(days):
            date_key = (period_start_kst.date() + timedelta(days=index)).isoformat()
            values = daily_by_date.get(date_key, {"scans": 0, "uniqueScans": 0})
            daily.append({"date": date_key, **values})

        redirect_rate = (
            round(period["web_redirects"] / period["scans"] * 100, 1)
            if period["scans"]
            else 0.0
        )

        return {
            "days": days,
            "summary": {
                "totalScans": total_scans,
                "totalVisitors": total_visitors,
                "periodScans": period["scans"],
                "periodUniqueScans": period["unique"],
                "todayScans": today_scans,
                "webRedirects": period["web_redirects"],
                "redirectRate": redirect_rate,
            },
            "daily": daily,
            "countries": [
                {"country": row.country, "scans": int(row.scans or 0)}
                for row in country_rows
            ],
            "cities": [
                {
                    "country": row.country,
                    "city": row.city,
                    "scans": int(row.scans or 0),
                }
                for row in city_rows
            ],
            "accessUrls": [
                {"accessUrl": row.access_url, "scans": int(row.scans or 0)}
                for row in access_url_rows
            ],
            "recent": {
                "items": [_serialize_scan(scan) for scan in recent_items],
                "total": recent_total,
                "limit": limit,
                "offset": offset,
            },
            "ipStorage": (
                "raw"
                if os.environ.get("QR_STORE_RAW_IP", "false").lower() in {"1", "true", "yes"}
                else "hashed"
            ),
        }
