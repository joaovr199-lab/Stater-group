import { randomBytes } from "node:crypto";

/** Código curto do link pessoal (sem caracteres ambíguos como 0/O, 1/I). */
export function newToken() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(randomBytes(6), (x) => abc[x % abc.length]).join("");
}
