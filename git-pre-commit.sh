#!/bin/sh
if [ ! -f .git/hooks/pre-commit ]; then
    cp ./git-pre-commit.sh .git/hooks/pre-commit
fi

FILES=$(git diff --cached --name-only --diff-filter=ACM "*.js" "*.jsx" | sed 's| |\\ |g')
[ -z "$FILES" ] && exit 0

echo "$FILES" | xargs npx prettier --write
echo "$FILES" | xargs npx eslint --fix --quiet
echo "$FILES" | xargs git add

exit 0
