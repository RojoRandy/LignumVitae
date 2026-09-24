# Dominios, DNS y TLS

Runbook de la cadena que sirve `lignumvitae.com.mx`. Mismo esquema que Arada
(`~/Developer/Agencia/.railway/DOMAINS.md`). Vive junto a `railway.ts` porque ese archivo
declara los mismos dominios. **No se agrega nada a `.railway/README.md`**: es boilerplate de
`railway config init` y podria regenerarse encima.

## Quien es dueno de que

| Pieza | Proveedor | Quien la toca |
|---|---|---|
| Registro de `lignumvitae.com.mx` | **Neubox** | El dueno del proyecto. Solo renovacion anual |
| Nameservers | Neubox apunta a Cloudflare | Ya hecho. No se toca |
| DNS, proxy, TLS de borde, Redirect Rule | **Cloudflare** (plan Free) | Por API o dashboard |
| Certificado de origen, servicios, variables | **Railway** | Por CLI o `railway.ts` |

El TLS publico lo termina **Cloudflare** (CNAME proxiados); el certificado de Railway solo cubre
el tramo Cloudflare -> origen. Por eso SSL de la zona va en `Full` y **nunca** en `Full (Strict)`.

## Hosts

| Host | Servicio |
|---|---|
| `lignumvitae.com.mx` | `@lignumvitae/landing` |
| `www.lignumvitae.com.mx` | Redirect Rule 301 -> apex, en el borde |
| `admin.lignumvitae.com.mx` | `@lignumvitae/admin` |
| `api.lignumvitae.com.mx` | `@lignumvitae/api` |

## Los 7 registros de la zona

| Tipo | Nombre | Valor | Proxy |
|---|---|---|---|
| CNAME | `@` | `32affngd.up.railway.app` (Cloudflare lo aplana en el apex) | naranja |
| TXT | `_railway-verify` | `railway-verify=277afa60…` | — |
| CNAME | `admin` | `47xugw2u.up.railway.app` | naranja |
| TXT | `_railway-verify.admin` | `railway-verify=4108a093…` | — |
| CNAME | `api` | `10vrzzb6.up.railway.app` | naranja |
| TXT | `_railway-verify.api` | `railway-verify=9cd161bd…` | — |
| AAAA | `www` | `100::` | naranja |

El `AAAA www -> 100::` no es un error: es el prefijo de descarte IPv6, el patron de Cloudflare
para un host que solo redirige. **No agregues un `A`** — en un registro proxiado Cloudflare
responde con sus propias IPs v4 y v6.

## Ajustes de zona

- **SSL/TLS: `Full`.**
- **Redirect Rule** (Rules -> Redirect Rules, a mano: ningun permiso de token cubre esa fase):
  `Hostname equals www.lignumvitae.com.mx` -> Dynamic
  `concat("https://lignumvitae.com.mx", http.request.uri.path)`, **301**, preservar query string.
- **Politicas de bots:** Search y Agent en `Allow`, Training en `Block`.

## Variables que dependen del dominio

| Servicio | Variable | Valor | Cuando se lee |
|---|---|---|---|
| api | `PUBLIC_SITE_URL` | `https://lignumvitae.com.mx` | runtime (links del PDF) |
| api | `CORS_ORIGINS` | `https://lignumvitae.com.mx,https://admin.lignumvitae.com.mx` | runtime |
| landing | `PUBLIC_API_URL` | `https://api.lignumvitae.com.mx/api` | **build** |
| admin | `VITE_API_URL` | `https://api.lignumvitae.com.mx/api` | **build** |
| admin | `VITE_PUBLIC_SITE_URL` | `https://lignumvitae.com.mx` (el landing, no el admin) | **build** |

Las de build se inlinean en el bundle: `railway variable set` **sin** `--skip-deploys` para que
dispare el redeploy. `CORS_ORIGINS` sin diagonal final.

## Agregar un subdominio

```bash
railway domain 'nuevo.lignumvitae.com.mx' --service '@lignumvitae/loquesea' --json
```

Devuelve los registros exactos (CNAME `requiredValue` + TXT `_railway-verify.<host>`). Se crean en
Cloudflare, se espera `railway domain status <host> --json` con `verified: true`, y se declara en
`railway.ts` (`networking.customDomains`). `railway config plan` debe quedar en `already up to date`.

## Diagnostico

| Sintoma | Causa | Arreglo |
|---|---|---|
| `ERR_TOO_MANY_REDIRECTS` | SSL de la zona en `Flexible` o `Full (Strict)` | Ponerlo en `Full` |
| `verification.verified` sigue en `false` | Falta el TXT o el host tiene typo | Cada host lleva su sufijo: `_railway-verify`, `.admin`, `.api` |
| `www` da error en vez de redirigir | Falta el `AAAA 100::` o quedo sin proxy | Crearlo proxiado |
| El admin llama a la API vieja o a `localhost` | La variable se puso con `--skip-deploys` | Volver a fijarla sin esa bandera |
| CORS rechaza al admin | Falta su origen en `CORS_ORIGINS` o sobra la diagonal | `https://admin.lignumvitae.com.mx` |
| `railway domain` dice `Environment is deleted` | Link local del CLI obsoleto | `railway environment production`; confirmar con `railway status` |
| Railway sigue en `VALIDATING_OWNERSHIP` media hora despues de `verified: true` | Railway tarda en emitir; `certificate retry` solo aplica si la emision **fallo** | No bloquea: con SSL `Full` el host ya sirve por HTTPS (`curl -I` da 200). Pasó con `api` al darlo de alta |
