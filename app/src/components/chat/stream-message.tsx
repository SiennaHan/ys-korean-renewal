import { getAccessToken } from '@/api/api';
import { useState, useEffect } from 'react'
import { AlertUserMsgBox, BotMsgBox, UserMsgBox } from './chat-text';
import { env } from '@/config/env';

export interface MsgProps {
  idx : string;
  hasAlert: boolean;
  isRequest: boolean;
  isBot : boolean;
  dialogId : string;
  chatId : number;
  setChatId: (id: number)=> void;
  setResponding: (flag: boolean)=> void;
  scrollToBottom: () => void;
  msg : string;
  feedback: string | null | undefined;
}

export default function StreamMessage({idx, hasAlert, isRequest, isBot, dialogId, chatId, setChatId, setResponding, scrollToBottom, msg, feedback}: MsgProps) {
  const API_ENDPOINT = env.KOREAN_API_URL + "/chat/stream/json"
  const [resMsg, setResMsg] = useState<string | null>(null)

  const fetchData = async (msg: string) => {
    const data = {
      dialogId: dialogId,
      chatId: chatId,
      msg: msg
    };

    let fullMsg = "";

    fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getAccessToken()}`, 'Content-Type': 'application/json; charset=utf-8',
        Accept: 'text/event-stream'
      },
      body: JSON.stringify(data)
    })
      .then((response) => {
				if (!response.body) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        const readChunk = (): any => {
          return reader.read().then(appendChunks);
        };

        const appendChunks = (result: any) => {
          const chunk = decoder.decode(result.value || new Uint8Array(), {
            stream: !result.done
          });
          var separateLines = chunk.split('\n');
          console.log("separateLines =>", separateLines);
          for (const idx in separateLines) {
            const line = separateLines[idx];
            const dataPart = line.substring(5); // 얖에 다섯문자 제거 'data:'
            if (dataPart != null && dataPart.trim().length > 1) {
              const obj = JSON.parse(dataPart);
              if (obj['chatId']) {
                setChatId(obj.chatId);
              } else if (obj['word']) {
                fullMsg = `${fullMsg}${obj.word}`
                setResMsg(fullMsg)
              }
            }
          }
          if (!result.done) {
            return readChunk();
          }
          scrollToBottom();
        };
        return readChunk();
      })
      .then(() => {
        console.log('finished stream');
        setResponding(false);
      })
      .catch((e) => {
        console.log('error stream', e);
        setResponding(false);
      });
  };

  useEffect(() => {
    scrollToBottom();
    if (isRequest) fetchData(msg)
  }, [idx])

  if (hasAlert) {
    return <AlertUserMsgBox msg={msg} alertMsg={feedback}/>
  } else if (isRequest) {
    return <BotMsgBox msg={resMsg ? resMsg : "..."} />
  } else if (isBot) {
    return <BotMsgBox msg={msg} />
  } else {
    return <UserMsgBox msg={msg} />
  }
}