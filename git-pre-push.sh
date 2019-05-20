#!/bin/sh
if [ ! -f .git/hooks/pre-push ]; then
    cp ./git-pre-push.sh .git/hooks/pre-push
fi
BRANCH=$( git symbolic-ref --short -q HEAD )
REMOTE=$( git rev-parse --verify "origin/${BRANCH}" )
if [ $? -ne 0 ]
then
    REMOTE=$( git merge-base "origin/master" HEAD )
fi
date "+%Y-%m-%d %T    Comparing to ${REMOTE}"

FILES=$(git diff --name-only --diff-filter=ACM "${REMOTE}" HEAD -- "*.js" "*.jsx" | sed 's| |\\ |g')

if [ -z "$FILES" ]
then
    date "+%Y-%m-%d %T    No committed JS changes since ${REMOTE}. LGTM!"
    exit 0
fi

echo "$FILES" | xargs npx eslint --quiet
if [ $? -ne 0 ]
then
    date "+%Y-%m-%d %T    Aborting push due to invalid files"
    exit 1
fi

date "+%Y-%m-%d %T    Finished validating all changes since ${REMOTE}. LGTM!"
exit 0
