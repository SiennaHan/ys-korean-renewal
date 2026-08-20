from fastapi.encoders import jsonable_encoder
from accepter.base import ReportItem
from persistence.database import sessionScope
from persistence import repo_error_report
from util import jsonutils


async def listReport(category: str):
    with sessionScope() as db:
        encoded_list = []
        chat_list = await repo_error_report.list(category, db)
        for chat in chat_list :
            encoded_list.append(jsonable_encoder(chat))

    return encoded_list

async def createReport(report: ReportItem):
    with sessionScope() as db:
        report = await repo_error_report.create(report.category, 
                                                report.target_id, 
                                                report.error_code, 
                                                report.error_msg, 
                                                report.content,
                                                report.user_id, 
                                                db)        
        return jsonable_encoder(report)