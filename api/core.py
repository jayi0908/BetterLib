import requests, re, base64, json
from datetime import datetime, timedelta
from Crypto.Cipher import AES
from typing import Optional, List, Dict

class LibCore:
    def __init__(self, host="https://booking.lib.zju.edu.cn", authorization=""):
        self.session = requests.Session()
        self.host = host
        self.cas_login_url = "https://zjuam.zju.edu.cn/cas/login?service=https%3A%2F%2Fbooking.lib.zju.edu.cn%2Fapi%2Fcas%2Fcas"
        self.service_url = self.host + "/api/cas/cas"
        self.authorization = authorization

    def pkcs7_pad(self, data: bytes, block_size=16) -> bytes:
        pad_len = block_size - len(data) % block_size
        return data + bytes([pad_len]) * pad_len

    def encrypt(self, y: str):
        key, iv = (
            (datetime.now().strftime("%Y%m%d") + datetime.now().strftime("%Y%m%d")[::-1]).encode("utf-8"),
            "ZZWBKJ_ZHIHUAWEI".encode("utf-8"),
        )
        return base64.b64encode(
            AES.new(key, AES.MODE_CBC, iv).encrypt(self.pkcs7_pad(y.encode("utf-8")))
        ).decode()

    def login(self, username, password) -> bool:
        try:
            resp = self.session.get(self.cas_login_url, params={"service": self.service_url})
            resp.raise_for_status()
            html = resp.text
            lt_start = html.find('name="lt" value="') + len('name="lt" value="')
            lt_end = html.find('"', lt_start)
            lt = html[lt_start:lt_end] if lt_start < lt_end else ""
            exec_start = html.find('name="execution" value="') + len('name="execution" value="')
            exec_end = html.find('"', exec_start)
            execution = html[exec_start:exec_end] if exec_start < exec_end else ""

            login_data = {
                "username": username,
                "password": password,
                "lt": lt,
                "execution": execution,
                "_eventId": "submit",
                "rmShown": 1,
            }
            resp = self.session.post(self.cas_login_url, data=login_data, params={"service": self.service_url}, allow_redirects=True)
            resp.raise_for_status()
            
            if "统一身份认证" in resp.text:
                return False
            
            match = re.search(r"cas=([a-fA-F0-9]+)", resp.url)
            cas_value = match.group(1) if match else None
            token_resp = self.session.post(self.host + "/api/cas/user", data={"cas": cas_value})
            token_resp.raise_for_status()
            token = json.loads(token_resp.text).get("member", {}).get("token", None)
            if token:
                self.authorization = f"bearer{token}"
                return True
            return False
        except Exception:
            return False

    def get_user_info(self):
        url = self.host + "/api/Member/my"
        resp = self.session.post(url, headers={"Authorization": self.authorization})
        return json.loads(resp.text).get("data", {}).get("name")

    def get_venues(self):
        url = self.host + "/reserve/index/quickSelect"
        resp = self.session.post(url, headers={"Authorization": self.authorization}, 
                                 json={"id":"1", "date": datetime.now().strftime("%Y-%m-%d"), 
                                       "categoryIds":["1"], "members":0, "authorization": self.authorization})
        return json.loads(resp.text).get("data", {})

    def get_seats(self, area_id):
        date_resp = self.session.post(self.host + "/api/Seat/date", 
                                      headers={"Authorization": self.authorization},
                                      json={"build_id": area_id, "authorization": self.authorization})
        date_data = json.loads(date_resp.text)
        if date_data.get("code") != 1:
            return None
        
        segment = date_data.get("data", [])[0].get("times", [])[0].get("id", "")
        
        seat_resp = self.session.post(self.host + "/api/Seat/seat",
                                      headers={"Authorization": self.authorization},
                                      json={
                                          "area": area_id,
                                          "segment": segment,
                                          "day": datetime.now().strftime("%Y-%m-%d"),
                                          "startTime": "00:01",
                                          "endTime": "23:59",
                                          "authorization": self.authorization
                                      })
        return {"segment": segment, "seats": json.loads(seat_resp.text).get("data", [])}

    def confirm_seat(self, seat_id, segment):
        aesjson = self.encrypt(json.dumps({"seat_id": seat_id, "segment": segment}))
        resp = self.session.post(self.host + "/api/Seat/confirm",
                                 headers={"Authorization": self.authorization},
                                 json={"aesjson": aesjson, "authorization": self.authorization})
        return json.loads(resp.text)

    def get_reservations(self):
        url = self.host + "/api/index/subscribe"
        resp = self.session.post(url, headers={"Authorization": self.authorization}, 
                                 data={"authorization": self.authorization})
        return json.loads(resp.text).get("data", [])

    def cancel_reservation(self, res_id, res_type):
        url = self.host + ("/api/Space/cancel" if res_type == 1 else "/api/space/seminarCancel")
        resp = self.session.post(url, headers={"Authorization": self.authorization},
                                 data={"id": res_id, "authorization": self.authorization})
        return json.loads(resp.text)
        
    def get_notices(self, limit: int = 3, page: int = 1):
        url = self.host + "/api/index/notice"
        data = {"limit": limit, "page": page, "authorization": self.authorization}
        resp = self.session.post(url, headers={"Authorization": self.authorization}, data=data)
        return json.loads(resp.text)

    def get_notice_detail(self, notice_id: str):
        url = self.host + "/api/index/noticeDetail"
        data = {"id": notice_id, "authorization": self.authorization}
        resp = self.session.post(url, headers={"Authorization": self.authorization}, data=data)
        return json.loads(resp.text)
    
    def get_booking_rules(self) -> dict:
        url = self.host + "/api/index/booking_rules"
        resp = self.session.post(
            url, 
            headers={"Authorization": self.authorization}, 
            data={"authorization": self.authorization}
        )
        try:
            return json.loads(resp.text)
        except Exception:
            return {"code": 0, "msg": "解析规则失败", "data": {}}

    def get_name(self, card: str, area: str, begin_time: str, end_time: str):
        url = self.host + "/api/Seminar/group"
        data = {
            "card": card,
            "area": area,
            "beginTime": begin_time,
            "endTime": end_time,
            "authorization": self.authorization,
        }
        resp = self.session.post(url, headers={"Authorization": self.authorization}, data=data)
        return json.loads(resp.text)

    def get_room_list(self, page: int = 1):
        url = self.host + "/reserve/index/list"
        data = {
            "id": "2", 
            "date": datetime.now().strftime("%Y-%m-%d"), 
            "members": 0, 
            "size": 10, 
            "page": page, 
            "authorization": self.authorization
        }
        resp = self.session.post(url, headers={"Authorization": self.authorization}, data=data)
        return json.loads(resp.text)

    def get_room_occupancy(self, room_id: str, area: str):
        url = self.host + "/api/Seminar/v1seminar"
        data = {"room": room_id, "area": area, "authorization": self.authorization}
        resp = self.session.post(url, headers={"Authorization": self.authorization}, data=data)
        return json.loads(resp.text)

    def book_room(self, day: str, start_time: str, end_time: str, title: str, content: str, mobile: str, area: str, is_open: str, teamusers: str):
        """预约研讨室 (已适配新版前端所需字段)"""
        if title == "团队讨论(班团,社团,兴趣小组,项目讨论)": titleId = "3"
        elif title == "课题研讨(导师组会,学术讨论)": titleId = "2"
        elif title == "其他研讨活动(视频会议)": titleId = "1"
        else: titleId = "3"
        
        book_data = {
            "day": day,
            "start_time": start_time,
            "end_time": end_time,
            "title": title,
            "content": content,
            "mobile": mobile,
            "room": area,
            "open": is_open,
            "file_name": "",
            "file_url": "",
            "titleId": titleId,
            "teamusers": teamusers,
            "id": 2,
        }
        aesjson = self.encrypt(json.dumps(book_data))
        url = self.host + "/reserve/index/confirm"
        resp = self.session.post(
            url,
            headers={"Authorization": self.authorization},
            data={"aesjson": aesjson, "authorization": self.authorization},
        )
        try:
            return json.loads(resp.text)
        except Exception:
            return {"code": 0, "msg": "解析返回结果失败", "raw": resp.text}
