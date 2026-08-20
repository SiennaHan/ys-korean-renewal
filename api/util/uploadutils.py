import base64
import fitz
from util import fileutils, stringutils, timeutils, s3utils

# fileData: base64 파일
# data:@file/png;base64,ffdkljafldsajflkjdsaklfjsaldkjflasdkj...
def uploadFile(filedata: str, chatId: int) :
    try :
        # extract filename & ext
        resultUrls = []
        data_part = filedata.split(',')[1]
        mimeType  = fileutils.getMimeType(filedata)
        media_ext   = mimeType.split("/")[1]

        if media_ext == 'jpg' or media_ext == 'jpeg' :
            media_ext = 'jpg'
            mimeType = 'image/jpeg'
            file = base64.b64decode(data_part)
            s3url = makeAndUpload(file, media_ext, mimeType, chatId)
            resultUrls.append(s3url)
        elif media_ext == 'png' :
            mimeType = 'image/png'
            file = base64.b64decode(data_part)
            s3url = makeAndUpload(file, media_ext, mimeType, chatId)
            resultUrls.append(s3url)
        elif media_ext == 'pdf' :
            mimeType = 'application/pdf'
            # 반복
            pdfFile = base64.b64decode(data_part)
            doc = fitz.open(stream=pdfFile, filetype="pdf")

            for i, page in enumerate(doc):
                pixmap = page.get_pixmap()
                img = pixmap.tobytes("png")
                s3url = makeAndUpload(img, "png", "image/png", chatId)
                resultUrls.append(s3url)

        return {"result":True, "detail": resultUrls}

    except Exception as error:
        print("upload image error", error)
        return {"result":False, "detail": f'could not upload caused by {error}'}

def makeAndUpload(decode_base64, media_ext, mimeType, chatId) :
    prefix_hash = stringutils.generate_file_prefix()
    filename    = prefix_hash + "." + media_ext

    dir_midfix = timeutils.get_current_datetime_ymdhmss()
    directory   = f'{chatId}/{media_ext}/d{dir_midfix}'

    s3url = s3utils.public_upload_to_s3(decode_base64, directory, filename, mimeType)

    print("s3url =>", s3url)

    return s3url