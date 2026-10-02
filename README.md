# Ginger Studio

A self-serve **custom T-shirt design studio** for Sweet Ginger Fashions (Shankar Hemrajani, Jaipur).
Pick a blank, add text or a logo, see it on the real shirt colour, set a quantity (one, or a bulk
size grid), and order. Built from the discovery brief.

Static site — no build, no backend, no database server, no auth, no keys, no network calls.

## Features

- **Product picker** — crew, oversized, polo, hoodie, cap, each with colours, sizes and a price
- **Design canvas** — text and image, move / scale / rotate, front and back, a print area the design cannot leave
- **Live preview** — the design sits on the chosen garment colour, ink treated as on fabric
- **Design survives** every colour, size, view and quantity change
- **Upload + background removal** — drop a logo, remove a flat background (runs on your device)
- **Prompt → design** — type or *speak* a prompt, get an editable design (local generator, no API)
- **Voice input** — mic to text (browser Speech API) with a typing fallback
- **Personal and Bulk modes** — per-size grid, live bulk tier pricing
- **Cart + order** — order request with a WhatsApp handoff (no payment is taken online)
- **Production** — artwork and mockup export (SVG), status pipeline
- **Leads & CRM** — bulk enquiries become leads with a pipeline, follow-ups and convert-to-order
- **Saved designs, reorder, loyalty**

Rules enforced in code: no order without artwork; a design cannot leave the print area; price comes
from product + method + quantity. Data is sample data and **sample rates** — labelled in the app.

Deployed on GitHub Pages from this repository.
