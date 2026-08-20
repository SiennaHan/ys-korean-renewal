from sqlalchemy import case, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from persistence import model


async def register_visitor(fingerprint_hash: str, db: Session) -> bool:
    """Return True only when this fingerprint is inserted for the first time."""
    try:
        with db.begin_nested():
            visitor = model.KoQrVisitor()
            visitor.fingerprint_hash = fingerprint_hash
            db.add(visitor)
            db.flush()
        return True
    except IntegrityError:
        return False


async def create_scan(
    tracking_id: str,
    access_url: str,
    ip_address: str,
    geo_country: str | None,
    geo_city: str | None,
    user_agent: str,
    fingerprint_hash: str,
    is_unique: bool,
    db: Session,
):
    scan = model.KoQrScan()
    scan.tracking_id = tracking_id
    scan.access_url = access_url
    scan.ip_address = ip_address
    scan.geo_country = geo_country
    scan.geo_city = geo_city
    scan.user_agent = user_agent
    scan.fingerprint_hash = fingerprint_hash
    scan.is_unique = is_unique
    scan.redirect_result = "pending"
    db.add(scan)
    db.flush()
    db.refresh(scan)
    return scan


async def update_redirect_result(tracking_id: str, redirect_result: str, db: Session):
    scan = db.query(model.KoQrScan).filter(
        model.KoQrScan.tracking_id == tracking_id,
    ).first()
    if scan is None:
        return None

    # A completed web redirect must not be downgraded by a late retry.
    if scan.redirect_result != "web_redirect":
        scan.redirect_result = redirect_result
        db.flush()
    return scan


async def count_all_scans(db: Session) -> int:
    return int(db.query(func.count(model.KoQrScan.id)).scalar() or 0)


async def count_all_visitors(db: Session) -> int:
    return int(db.query(func.count(model.KoQrVisitor.fingerprint_hash)).scalar() or 0)


async def get_period_summary(start_at, end_at, db: Session):
    row = db.query(
        func.count(model.KoQrScan.id),
        func.count(func.distinct(model.KoQrScan.fingerprint_hash)),
        func.sum(case((model.KoQrScan.redirect_result == "web_redirect", 1), else_=0)),
    ).filter(
        model.KoQrScan.scanned_at >= start_at,
        model.KoQrScan.scanned_at < end_at,
    ).one()
    return {
        "scans": int(row[0] or 0),
        "unique": int(row[1] or 0),
        "web_redirects": int(row[2] or 0),
    }


async def count_scans_between(start_at, end_at, db: Session) -> int:
    return int(db.query(func.count(model.KoQrScan.id)).filter(
        model.KoQrScan.scanned_at >= start_at,
        model.KoQrScan.scanned_at < end_at,
    ).scalar() or 0)


async def get_daily_stats(start_at, end_at, db: Session):
    kst_date = func.date(func.convert_tz(model.KoQrScan.scanned_at, "+00:00", "+09:00"))
    return db.query(
        kst_date.label("scan_date"),
        func.count(model.KoQrScan.id).label("scans"),
        func.count(func.distinct(model.KoQrScan.fingerprint_hash)).label("unique_scans"),
    ).filter(
        model.KoQrScan.scanned_at >= start_at,
        model.KoQrScan.scanned_at < end_at,
    ).group_by(kst_date).order_by(kst_date.asc()).all()


async def get_country_stats(start_at, end_at, limit: int, db: Session):
    country = func.coalesce(func.nullif(model.KoQrScan.geo_country, ""), "Unknown")
    return db.query(
        country.label("country"),
        func.count(model.KoQrScan.id).label("scans"),
    ).filter(
        model.KoQrScan.scanned_at >= start_at,
        model.KoQrScan.scanned_at < end_at,
    ).group_by(country).order_by(func.count(model.KoQrScan.id).desc()).limit(limit).all()


async def get_city_stats(start_at, end_at, limit: int, db: Session):
    country = func.coalesce(func.nullif(model.KoQrScan.geo_country, ""), "Unknown")
    city = func.coalesce(func.nullif(model.KoQrScan.geo_city, ""), "Unknown")
    return db.query(
        country.label("country"),
        city.label("city"),
        func.count(model.KoQrScan.id).label("scans"),
    ).filter(
        model.KoQrScan.scanned_at >= start_at,
        model.KoQrScan.scanned_at < end_at,
    ).group_by(country, city).order_by(func.count(model.KoQrScan.id).desc()).limit(limit).all()


async def get_access_url_stats(start_at, end_at, limit: int, db: Session):
    access_url = func.coalesce(func.nullif(model.KoQrScan.access_url, ""), "unknown")
    return db.query(
        access_url.label("access_url"),
        func.count(model.KoQrScan.id).label("scans"),
    ).filter(
        model.KoQrScan.scanned_at >= start_at,
        model.KoQrScan.scanned_at < end_at,
    ).group_by(access_url).order_by(func.count(model.KoQrScan.id).desc()).limit(limit).all()


async def get_recent_scans(start_at, end_at, limit: int, offset: int, db: Session):
    query = db.query(model.KoQrScan).filter(
        model.KoQrScan.scanned_at >= start_at,
        model.KoQrScan.scanned_at < end_at,
    )
    total = int(query.with_entities(func.count(model.KoQrScan.id)).scalar() or 0)
    items = query.order_by(model.KoQrScan.scanned_at.desc(), model.KoQrScan.id.desc()).offset(
        offset,
    ).limit(limit).all()
    return items, total
