---
name: DrainWatch safety data
description: Durable constraints for the civic safety product.
---

DrainWatch should never present fabricated operational context as live government data. Keep civilian and officer permissions enforced on the server, label deterministic fixtures as demo data, derive map marker colors from backend-owned risk scores, and show explicit unavailable states for providers that are not configured.

**Why:** This product is safety-adjacent; invented coordinates, weather, AI confidence, or government status can create false trust.

**How to apply:** Preserve these rules when adding integrations, new report sources, or production authentication.