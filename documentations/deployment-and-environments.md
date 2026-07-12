Git model
main
→ production

staging
→ stalni staging URL

feature/\*
→ PR preview deployments
Odvojeni resursi
Resurs Preview Staging Production
Database test/branch staging DB production DB
Resend test sender staging sender verified production domain
Storage test prefix staging bucket production bucket
OAuth development staging app production app
Payments sandbox sandbox live
Push keys test staging VAPID production VAPID

Preview deployment nikada ne treba da koristi production bazu.
