// Fetches a public web page safely for the website scorer.
// - only http/https on normal ports
// - refuses private / internal network addresses (checked at connect time, so DNS tricks don't work)
// - follows at most 4 redirects, re-checking each hop
// - stops after a size limit and a time limit
const http = require("http");
const https = require("https");
const dns = require("dns");
const net = require("net");

const UA = "Mozilla/5.0 (compatible; WatamelonScore/1.0; +https://heyywatamelon.in/score)";

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7));
  return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("ff");
}

// dns lookup that refuses private addresses
function safeLookup(hostname, options, cb) {
  dns.lookup(hostname, { ...options, all: true }, (err, addrs) => {
    if (err) return cb(err);
    const ok = addrs.filter((a) => !isPrivateIp(a.address));
    if (!ok.length) return cb(Object.assign(new Error("Blocked address"), { code: "EBLOCKED" }));
    if (options && options.all) return cb(null, ok);
    cb(null, ok[0].address, ok[0].family);
  });
}

function normalizeUrl(input) {
  let s = String(input || "").trim();
  if (!s) throw userError("Please enter a website address.");
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  let u;
  try { u = new URL(s); } catch { throw userError("That doesn't look like a website address."); }
  if (!/^https?:$/.test(u.protocol)) throw userError("Only http and https websites can be scored.");
  if (u.port && !["80", "443"].includes(u.port)) throw userError("Only websites on standard ports can be scored.");
  if (!u.hostname.includes(".") || net.isIP(u.hostname)) throw userError("Please enter a public domain name, like example.com.");
  if (u.username || u.password) throw userError("Please enter the address without a login.");
  u.hash = "";
  return u;
}

function userError(msg) { return Object.assign(new Error(msg), { userFacing: true }); }

function getOnce(u, { timeoutMs, maxBytes }) {
  return new Promise((resolve, reject) => {
    const lib = u.protocol === "https:" ? https : http;
    const started = Date.now();
    let firstByteMs = null;
    const req = lib.get(u, {
      lookup: safeLookup,
      headers: { "User-Agent": UA, Accept: "text/html,text/css,*/*;q=0.8", "Accept-Language": "en" },
      timeout: timeoutMs,
    }, (res) => {
      firstByteMs = Date.now() - started;
      const chunks = []; let size = 0;
      res.on("data", (c) => {
        size += c.length;
        if (size > maxBytes) { chunks.push(c.subarray(0, c.length - (size - maxBytes))); res.destroy(); return; }
        chunks.push(c);
      });
      const done = () => resolve({
        status: res.statusCode, headers: res.headers,
        body: Buffer.concat(chunks).toString("utf8"), bytes: size, truncated: size > maxBytes,
        firstByteMs, totalMs: Date.now() - started,
      });
      res.on("end", done); res.on("close", done);
      res.on("error", reject);
    });
    req.on("timeout", () => req.destroy(userError("The website took too long to respond.")));
    req.on("error", reject);
  });
}

async function fetchPage(input, { timeoutMs = 8000, maxBytes = 2_000_000 } = {}) {
  let u = input instanceof URL ? input : normalizeUrl(input);
  for (let hop = 0; hop <= 4; hop++) {
    let r;
    try { r = await getOnce(u, { timeoutMs, maxBytes }); }
    catch (e) {
      if (e.userFacing) throw e;
      if (e.code === "EBLOCKED") throw userError("That address isn't a public website.");
      if (e.code === "ENOTFOUND") throw userError("We couldn't find that website. Check the spelling?");
      throw userError("We couldn't reach that website right now.");
    }
    if (r.status >= 300 && r.status < 400 && r.headers.location) {
      const next = new URL(r.headers.location, u);
      if (!/^https?:$/.test(next.protocol)) throw userError("That website redirects somewhere we can't follow.");
      u = next; continue;
    }
    return { ...r, finalUrl: u.href, https: u.protocol === "https:" };
  }
  throw userError("That website redirects too many times.");
}

module.exports = { fetchPage, normalizeUrl, isPrivateIp, userError };
