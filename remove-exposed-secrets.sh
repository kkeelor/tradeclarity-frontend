#!/bin/bash
# Script to remove exposed API secrets from git history
# WARNING: This rewrites git history. All team members must re-clone after this.

set -e

echo "⚠️  WARNING: This script will rewrite git history to remove exposed secrets."
echo "⚠️  All team members will need to re-clone the repository after this."
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

# The exposed secrets to remove
COINDCX_API_KEY="d314df7c8b51489735dcd82c143c6b0e5429b9c0cd1ac915"
COINDCX_API_SECRET="43a821596286b13b1e18c4200b470747a1d099e11d18ee5e32f8056aa324c8e7"

echo "Removing exposed secrets from git history..."

# Create a temporary script for the tree filter
cat > /tmp/remove_secrets.sh << 'EOFSCRIPT'
#!/bin/bash
if [ -f app/analyze/page.js ]; then
  # Use perl for cross-platform compatibility
  perl -pi -e 's/d314df7c8b51489735dcd82c143c6b0e5429b9c0cd1ac915/REMOVED_API_KEY/g' app/analyze/page.js 2>/dev/null || true
  perl -pi -e 's/43a821596286b13b1e18c4200b470747a1d099e11d18ee5e32f8056aa324c8e7/REMOVED_API_SECRET/g' app/analyze/page.js 2>/dev/null || true
fi
EOFSCRIPT
chmod +x /tmp/remove_secrets.sh

# Use git filter-branch to remove the secrets from all branches
git filter-branch --force --tree-filter '/tmp/remove_secrets.sh' \
  --prune-empty --tag-name-filter cat -- --all

# Clean up backup refs
git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d 2>/dev/null || true

# Expire reflog and garbage collect
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Clean up temp script
rm -f /tmp/remove_secrets.sh

echo ""
echo "✅ Secrets removed from git history."
echo ""
echo "⚠️  CRITICAL NEXT STEPS:"
echo "1. Review changes: git log --all"
echo "2. Force push to remote: git push origin --force --all"
echo "3. Force push tags: git push origin --force --tags"
echo "4. Notify all team members to re-clone the repository"
echo "5. ROTATE THE EXPOSED API KEYS IMMEDIATELY on CoinDCX"
echo "6. Delete this script after completion: rm remove-exposed-secrets.sh"
