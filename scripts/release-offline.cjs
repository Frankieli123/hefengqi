const net = require("node:net");
const dgram = require("node:dgram");
const dns = require("node:dns");

function denied() {
  throw new Error("Release validation is offline: network/DB access is forbidden");
}

net.Socket.prototype.connect = denied;
net.Server.prototype.listen = denied;
dgram.Socket.prototype.send = denied;
dns.lookup = denied;
dns.resolve = denied;
if (globalThis.fetch) globalThis.fetch = async () => denied();
