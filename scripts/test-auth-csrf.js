import assert from "node:assert/strict";
import { csrfToken, verifyCsrf } from "../src/middleware/csrf.js";

const runVerify = req => new Promise(resolve => {
  let nextError = Symbol("not-called");
  const res = {};
  verifyCsrf(req, res, error => { nextError = error || null; resolve(nextError); });
});
const request = ({ path="/login", token="bad", sessionToken="good", origin="https://crm.example.com", host="crm.example.com" }={}) => ({
  method:"POST", path, body:{_csrf:token}, query:{}, session:{csrfToken:sessionToken}, headers:{origin,host},
  get(name){return this.headers[String(name).toLowerCase()]||"";}
});

{
  const req={session:{}}; const res={locals:{}};
  csrfToken(req,res,()=>{});
  assert.match(req.session.csrfToken,/^[a-f0-9]{48}$/);
  assert.equal(res.locals.csrfToken,req.session.csrfToken);
}
assert.equal(await runVerify(request({token:"good"})),null,"geçerli token kabul edilmeli");
assert.equal(await runVerify(request({path:"/login"})),null,"aynı kaynak eski login tokenı güvenli toleransla kabul edilmeli");
assert.equal(await runVerify(request({path:"/logout"})),null,"aynı kaynak eski logout tokenı güvenli toleransla kabul edilmeli");
assert.equal((await runVerify(request({path:"/login",origin:"https://evil.example"})))?.code,"CSRF_INVALID","çapraz kaynak login reddedilmeli");
assert.equal((await runVerify(request({path:"/settings",origin:"https://crm.example.com"})))?.code,"CSRF_INVALID","diğer POST rotaları token olmadan reddedilmeli");
console.log("AUTH_CSRF_TESTS=5/5 OK");
