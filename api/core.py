import requests, re, base64, json, httpx, posixpath, asyncio, time
from datetime import datetime, timedelta
from Crypto.Cipher import AES
from urllib.parse import urlparse
from fastapi import Request, Response
from typing import Optional, List, Dict

# 结构: {"学号": {"webhook_url": "https://oapi.dingtalk.com/...", "cookie": "xxx", "push_delay": 0, "last_status": "6", ...}}
USER_PUSH_CONFIGS = {}
LOCAL_PROXY_PREFIX = "https://libapi.jayi0908.cn/proxy"

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

    def get_venues(self, date):
        url = self.host + "/reserve/index/quickSelect"
        date = date if date else datetime.now().strftime("%Y-%m-%d")
        resp = self.session.post(url, headers={"Authorization": self.authorization}, 
                                 json={"id":"1", "date": date, "categoryIds":["1"], "members":0, "authorization": self.authorization})
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

    def book_seat(self, seat_id, segment):
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
                                 json={"id": res_id, "authorization": self.authorization})
        return json.loads(resp.text)
    
    def seat_leave(self, res_id):
        url = self.host + "/api/Space/leave"
        resp = self.session.post(url, headers={"Authorization": self.authorization},
                                 json={"id": res_id, "authorization": self.authorization})
        return json.loads(resp.text)

    def seat_return(self, res_id):
        url = self.host + "/api/Space/signin"
        resp = self.session.post(url, headers={"Authorization": self.authorization},
                                 json={"id": res_id, "authorization": self.authorization})
        return json.loads(resp.text)
    
    def seat_checkout_inspace(self, res_id):
        url = self.host + "/api/Space/checkout"
        resp = self.session.post(url, headers={"Authorization": self.authorization},
                                 json={"id": res_id, "authorization": self.authorization})
        return json.loads(resp.text)
    
    def seat_checkout_outspace(self):
        url = self.host + "/api/Seat/touch_qr_books"
        aesjson = self.encrypt(json.dumps({"method":"checkout"}))
        resp = self.session.post(url, headers={"Authorization": self.authorization},
                                 json={"aesjson": aesjson, "authorization": self.authorization})
        return json.loads(resp.text)

    def seat_set_power(self, res_id, area_id, status):
        url = self.host + "/reserve/smartDevice/setRelayStatus"
        resp = self.session.post(url, headers={"Authorization": self.authorization},
                                 json={"id": res_id, "area_id": area_id, "status": status, "authorization": self.authorization})
        return json.loads(resp.text)

    def seat_set_light(self, res_id, area_id, status, is_turn):
        if is_turn: payload = {"id": res_id, "area_id": area_id, "status": status, "authorization": self.authorization}
        else: payload = {"id": res_id, "area_id": area_id, "brightness": status, "authorization": self.authorization}
        url = self.host + "/reserve/smartDevice/setLightStatus"
        resp = self.session.post(url, headers={"Authorization": self.authorization},
                                 json=payload)
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

async def process_universal_proxy(target_url: str, request: Request) -> Response:
    """
    反向代理核心逻辑，包含 OPTIONS 拦截、请求转发、CORS 伪造、以及复杂的 HTML/JS/JSON 劫持重写
    """
    # 0. 秒回 OPTIONS 预检请求
    if request.method == "OPTIONS":
        return Response(status_code=200, headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*"
        })

    # 1. 修复 FastAPI 路由可能会吞掉的 //
    target_url = re.sub(r'^(https?:)/+', r'\1//', target_url)
    if request.url.query:
        target_url += f"?{request.url.query}"

    # 2. 发起请求
    async with httpx.AsyncClient(verify=False) as client:
        # 清洗敏感 Header
        safe_headers = {
            k: v for k, v in request.headers.items() 
            if k.lower() not in ["host", "origin", "referer", "accept-encoding", "content-length"]
        }
        safe_headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0"
        
        parsed_target = urlparse(target_url)
        safe_headers["Host"] = parsed_target.netloc
        
        # 破解清华图床防盗链
        if "cckb.lib.tsinghua.edu.cn" in target_url:
            safe_headers["Referer"] = "http://bis.lib.zju.edu.cn:8003/"
            safe_headers["Origin"] = "http://bis.lib.zju.edu.cn:8003"
        else:
            safe_headers["Referer"] = f"{parsed_target.scheme}://{parsed_target.netloc}/"

        try:
            resp = await client.request(
                method=request.method,
                url=target_url,
                headers=safe_headers,
                content=await request.body(),
                follow_redirects=True
            )
        except Exception as e:
            return Response(content=f"Proxy Error: {str(e)}", status_code=502)

    response_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
    }
    content_type = resp.headers.get("Content-Type", "")
    if content_type:
        response_headers["Content-Type"] = content_type

    # 清理 JSON 里的清华图床绝对路径
    if "application/json" in content_type.lower():
        text_content = resp.text
        text_content = text_content.replace(
            "https://cckb.lib.tsinghua.edu.cn", 
            f"{LOCAL_PROXY_PREFIX}/https://cckb.lib.tsinghua.edu.cn"
        )
        text_content = text_content.replace(
            "https:\\/\\/cckb.lib.tsinghua.edu.cn", 
            f"{LOCAL_PROXY_PREFIX.replace('/', '\\/')}\\/https:\\/\\/cckb.lib.tsinghua.edu.cn"
        )
        return Response(content=text_content, status_code=resp.status_code, headers=response_headers)

    # 深层拦截 HTML / JS / CSS
    if any(t in content_type.lower() for t in ["text/", "application/javascript"]):
        text_content = resp.text
        
        parsed_url = urlparse(target_url)
        base_site_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
        
        # 精确提取目标网页的所在目录
        url_dir = posixpath.dirname(parsed_url.path)
        if not url_dir.endswith('/'):
            url_dir += '/'

        # 针对 Webpack 打包的 JS：强行替换硬编码的 Public Path
        if "application/javascript" in content_type.lower():
            text_content = text_content.replace('"/searchbook/', f'"{LOCAL_PROXY_PREFIX}/{base_site_url}/searchbook/')
            text_content = text_content.replace("'/searchbook/", f"'{LOCAL_PROXY_PREFIX}/{base_site_url}/searchbook/")
            text_content = text_content.replace('"/data/', f'"{LOCAL_PROXY_PREFIX}/{base_site_url}/data/')

        # 正则替换 HTML/CSS 中的静态资源
        text_content = re.sub(
            r'(src|href)=["\'](https?://[^"\']+)["\']', 
            rf'\1="{LOCAL_PROXY_PREFIX}/\2"', 
            text_content, flags=re.IGNORECASE
        )
        text_content = re.sub(
            r'(src|href)=["\'](/[^/][^"\']*)["\']', 
            rf'\1="{LOCAL_PROXY_PREFIX}/{base_site_url}\2"', 
            text_content, flags=re.IGNORECASE
        )
        text_content = re.sub(
            r'url\(["\']?(/[^)"\']+)["\']?\)', 
            rf'url("{LOCAL_PROXY_PREFIX}/{base_site_url}\1")', 
            text_content, flags=re.IGNORECASE
        )

        if "text/html" in content_type.lower():
            # 注入精准的 Base Tag
            base_tag = f'<base href="{LOCAL_PROXY_PREFIX}/{base_site_url}{url_dir}">'
            
            js_interceptor = f"""
            <script>
                (function() {{
                    const proxyPrefix = "{LOCAL_PROXY_PREFIX}/";
                    const targetOrigin = "{base_site_url}"; 
                    
                    function rewriteUrl(url) {{
                        if (typeof url !== 'string' || url.startsWith(proxyPrefix) || url.startsWith('data:') || url.startsWith('blob:')) return url;
                        if (url.startsWith('http')) return proxyPrefix + url;
                        if (url.startsWith('//')) return proxyPrefix + 'http:' + url; 
                        if (url.startsWith('/')) return proxyPrefix + targetOrigin + url;
                        return url;
                    }}
                    
                    const originalFetch = window.fetch;
                    window.fetch = async function(...args) {{
                        if (args[0] instanceof Request) {{
                            args[0] = new Request(rewriteUrl(args[0].url), args[0]);
                        }} else {{
                            args[0] = rewriteUrl(args[0]);
                        }}
                        return originalFetch.apply(this, args);
                    }};
                    const originalOpen = XMLHttpRequest.prototype.open;
                    XMLHttpRequest.prototype.open = function(method, url, ...rest) {{
                        return originalOpen.call(this, method, rewriteUrl(url), ...rest);
                    }};
                    
                    const originalSetAttribute = Element.prototype.setAttribute;
                    Element.prototype.setAttribute = function(name, value) {{
                        if ((name === 'src' || name === 'href') && value) {{
                            value = rewriteUrl(value);
                        }}
                        return originalSetAttribute.call(this, name, value);
                    }};
                }})();
            </script>
            <style>.header, .footer {{ display: none !important; }}</style>
            """
            
            if "<head>" in text_content:
                text_content = text_content.replace("<head>", f"<head>\n{base_tag}\n{js_interceptor}", 1)
            else:
                text_content = base_tag + js_interceptor + text_content

        return Response(content=text_content, status_code=resp.status_code, headers=response_headers)

    return Response(content=resp.content, status_code=resp.status_code, headers=response_headers)

async def send_dingtalk_push(webhook_url: str, title: str, content: str):
    """向钉钉群机器人发送通知"""
    if not webhook_url:
        return
        
    # 注意：这里的 content 必须包含我们在钉钉机器人里设置的【自定义关键词】
    # 关键词设定为 "BetterLib提醒"
    message_text = f"【BetterLib提醒】{title}\n{content}"
    
    async with httpx.AsyncClient() as client:
        try:
            await client.post(
                webhook_url,
                json={
                    "msgtype": "text",
                    "text": {
                        "content": message_text
                    }
                },
                timeout=10.0
            )
            print(f"[+] 钉钉推送成功: {title}")
        except Exception as e:
            print(f"[-] 钉钉推送失败: {e}")

async def check_seat_status_background():
    """死循环后台任务：处理多用户的延迟推送逻辑"""
    while True:
        current_time = time.time()
        
        for user_id, config in list(USER_PUSH_CONFIGS.items()):
            webhook_url = config.get("webhook_url")
            cookie = config.get("cookie")
            delay_minutes = config.get("push_delay", 0)
            
            if not webhook_url or not cookie:
                continue
                
            try:
                lib = LibCore(authorization=cookie)
                if hasattr(asyncio, "to_thread"):
                    reservations = await asyncio.to_thread(lib.get_reservations)
                else:
                    reservations = lib.get_reservations()
                if isinstance(reservations, dict):
                    reservations = reservations.get("data", [])
                current_status = ""
                
                # 从预约列表中找到当前生效的“座位”预约 (通常 type=1 表示座位)
                if isinstance(reservations, list):
                    for rsv in reservations:
                        if rsv.get("type") == 1:
                            current_status = str(rsv.get("spaceStatus", ""))
                            break
                
                # 如果没有获取到状态，说明当前没有生效的座位预约，直接重置该用户状态并跳过
                if not current_status:
                    config["leave_time"] = None
                    config["has_pushed"] = False
                    config["last_status"] = None
                    continue

                # 读取旧状态
                last_status = config["last_status"]
                has_pushed = config["has_pushed"]
                leave_time = config["leave_time"]
                
                if current_status == "7":
                    need_back_time = datetime.strptime(rsv.get("needBackTime", ""), '%Y-%m-%d %H:%M:%S').strftime('%H:%M:%S')
                    if last_status != "7":
                        # 刚刚切入到临时离开状态，开始计时！
                        print(f"[*] 用户 {user_id} 刚刚离馆，开始倒计时 {delay_minutes} 分钟。")
                        config["leave_time"] = current_time
                        config["has_pushed"] = False
                        if delay_minutes == 0:
                            # 如果没有设置延迟，立即推送
                            await send_dingtalk_push( 
                                webhook_url=webhook_url,
                                title="⚠️ 临时离开提醒",
                                content=f"同学您好，您的座位已离开，如果不需要座位请尽快进行完全离开操作，或在 {need_back_time} 前返回座位，以免违规。"
                            )
                            config["has_pushed"] = True
                    else:
                        # 已经处于离开状态，检查是否达到了延迟时间
                        if not has_pushed and leave_time is not None:
                            elapsed_minutes = (current_time - leave_time) / 60
                            
                            if elapsed_minutes >= delay_minutes:
                                await send_dingtalk_push( 
                                    webhook_url=webhook_url,
                                    title="⚠️ 临时离开提醒",
                                    content=f"同学您好，您的座位已离开超过 {delay_minutes} 分钟，如果不需要座位请尽快进行完全离开操作，或在 {need_back_time} 前返回座位，以免违规。"
                                )
                                # 标记已推送，防止重复轰炸
                                config["has_pushed"] = True
                else:
                    # 如果状态不是 7（比如已落座是 6，或者预约结束），清理计时器
                    config["leave_time"] = None
                    config["has_pushed"] = False
                    config["last_status"] = None
                # 更新上一轮状态供下次循环比对
                config["last_status"] = current_status
                
            except Exception as e:
                print(f"[-] 获取用户 {user_id} 状态失败: {e}")
                
        # 每 60 秒轮询一次全局任务
        await asyncio.sleep(60)