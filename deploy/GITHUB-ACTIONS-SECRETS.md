# GitHub Actions secrets (required for deploy)

If deploy fails with:

```text
ssh: Could not resolve hostname : Name or service not known
VPS_HOST:
VPS_USER:
```

the repository **does not have Actions secrets configured** (or names are wrong).

## Add secrets (one-time)

1. Open: **https://github.com/mpapouts68/peqi/settings/secrets/actions**
2. Click **New repository secret** for each row below.

| Secret name | Value | Example (PEQI) |
|-------------|--------|----------------|
| `VPS_HOST` | VPS IPv4 only (no `ssh://`, no path) | `212.192.3.42` |
| `VPS_USER` | SSH login user | `root` |
| `VPS_SSH_KEY` | **Private** SSH key (full file, including `-----BEGIN...` lines) | contents of `~/.ssh/github_deploy` on VPS |
| `VPS_APP_DIR` | App path on server *(optional)* | `/var/www/peqi` |

Names must match **exactly** (case-sensitive): `VPS_HOST`, not `VPS_HOSTNAME`.

## Get `VPS_SSH_KEY`

On the VPS (or the machine that can SSH to the VPS):

```bash
# If you already created a deploy key:
cat ~/.ssh/github_deploy

# Or create one:
ssh-keygen -t ed25519 -N "" -f ~/.ssh/github_deploy -C "github-actions-peqi"
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github_deploy   # copy ALL of this into GitHub secret VPS_SSH_KEY
```

Paste the **private** key into GitHub. Never commit it to git.

## Test SSH from your PC

```bash
ssh -i path/to/github_deploy root@212.192.3.42 "echo OK && ls /var/www/peqi"
```

## Re-run deploy

After saving all secrets:

1. **Actions** → **Deploy PEQI** → **Run workflow** → branch `main` → **Run workflow**

Or push any commit to `main`.

## Optional: organization secrets

If the repo is under an organization, secrets can live under **Organization settings → Secrets**. They must still be named `VPS_HOST`, etc., and be **available to this repository**.
