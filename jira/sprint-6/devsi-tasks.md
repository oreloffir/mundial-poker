# Devsi — Sprint 6 Tasks

**Sprint:** April 5–12, 2026
**Role:** DevOps
**Total tasks:** 2

Deploy after EVERY change. Update Clodi after EVERY task.

---

## D6 — Domain Setup

**Priority:** High
**Deadline:** April 7

### Requirements

1. **Ask Orel:** Does he have a domain? Options:
   - `mundialpoker.com` or `mundialpoker.dev` — buy one (~$10/year)
   - `wpc.oreloffir.com` — subdomain of existing domain (free)
   - Keep IP for now, domain in Sprint 7

2. **If domain available:**
   - Point DNS A record to Elastic IP `52.49.249.190`
   - Install Certbot on EC2 for Let's Encrypt SSL:
     ```bash
     sudo yum install certbot python3-certbot-nginx -y
     sudo certbot --nginx -d dev.mundialpoker.com
     ```
   - Update nginx.conf to redirect HTTP → HTTPS
   - Update `CORS_ORIGINS` in `.env.production` with the domain

3. **If no domain yet:** Skip SSL, keep HTTP on IP. Document the steps for later.

### Deliverables

- [ ] Domain pointing to EC2 (or documented for later)
- [ ] SSL certificate (if domain available)
- [ ] CORS updated with domain
- [ ] HTTPS redirect working

---

## D7 — PWA + Deploy Pipeline Verification

**Priority:** Medium
**Deadline:** April 9

### Requirements

1. **Verify Joni's PWA manifest works on deployed server:**
   - After J29 merges and deploys, test on a real phone:
   - Open the URL in Chrome mobile
   - Check "Add to Home Screen" appears
   - Add it → verify it launches in full-screen landscape mode
   - Verify no address bar visible

2. **Deploy pipeline stress test:**
   - Push 3 consecutive commits to main within 5 minutes
   - Verify each one deploys correctly (no race condition)
   - Verify health check passes after each deploy
   - Document any issues

3. **EC2 monitoring:**
   - Check disk usage: `docker system df`
   - If images are piling up: `docker system prune -f` and add to deploy script
   - Check memory: `free -m` — flag if <200MB free
   - Add `docker system prune -f` to the CD deploy script to auto-clean old images

### Deliverables

- [ ] PWA verified on real phone
- [ ] Deploy pipeline handles rapid pushes
- [ ] EC2 disk/memory monitored
- [ ] Auto-prune added to deploy script

---

## Delivery Log

| Task | Status                                           | Deployed |
| ---- | ------------------------------------------------ | -------- |
| D6   | ⬜ Blocked — waiting on Orel's answer re: domain |          |
| D7   | 🔄 In progress                                   |          |

### D7 Progress Log

**April 5, 2026**

- EC2 snapshot: disk 34% (6.8GB/20GB), build cache 3.8GB reclaimable, memory 236MB available
- Manually pruned: freed 4GB, disk now 21%
- PR #12 open: auto-prune added to CD deploy script (`docker system prune -f` + `docker builder prune -f`)
- Memory: 236MB available — above 200MB threshold, swap healthy (88/1024MB used)
- Pending: PWA phone test (waiting for J29 to merge), pipeline stress test, PR #12 merge

# stress test 3
