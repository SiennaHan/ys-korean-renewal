import datetime
from datetime import timezone, timedelta

KST = timezone(timedelta(hours=9))

def now():
    return datetime.datetime.now(KST)

def get_microtime():
    return datetime.datetime.now(KST).timestamp() * 1000000

def get_milisecond():
    return datetime.datetime.now(KST).timestamp()

def get_current_datetime_ymdhmss() :
    return datetime.datetime.now(KST).strftime("%Y%m%d_%H%M%S")