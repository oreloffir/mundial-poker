#!/bin/bash
# Mundial Poker — One-time AWS infrastructure setup for DB backups
# Run this ONCE from a machine with AWS CLI configured (Orel's laptop or AWS CloudShell)
# After running, attach the IAM role to the EC2 instance (see step 4)
#
# Prerequisites:
#   aws cli configured with admin credentials
#   Instance ID: i-0b95a73440e9e9111

set -euo pipefail

REGION="eu-west-1"
BUCKET="mundial-poker-backups"
INSTANCE_ID="i-0b95a73440e9e9111"
ROLE_NAME="mundial-poker-ec2-backup"
PROFILE_NAME="mundial-poker-ec2-profile"

echo "=== Step 1: Create S3 bucket ==="
aws s3 mb "s3://${BUCKET}" --region "$REGION"

echo "=== Step 2: Enable versioning ==="
aws s3api put-bucket-versioning \
  --bucket "$BUCKET" \
  --versioning-configuration Status=Enabled

echo "=== Step 3: Add lifecycle rule — delete after 30 days ==="
aws s3api put-bucket-lifecycle-configuration \
  --bucket "$BUCKET" \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "delete-old-backups",
      "Status": "Enabled",
      "Filter": { "Prefix": "daily/" },
      "Expiration": { "Days": 30 },
      "NoncurrentVersionExpiration": { "NoncurrentDays": 7 }
    }]
  }'

echo "=== Step 4: Create IAM role (EC2 trust policy) ==="
aws iam create-role \
  --role-name "$ROLE_NAME" \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": { "Service": "ec2.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }]
  }'

echo "=== Step 5: Attach inline policy — S3 write-only to backup bucket ==="
aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "s3-backup-write" \
  --policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
      \"Effect\": \"Allow\",
      \"Action\": [\"s3:PutObject\", \"s3:GetObject\", \"s3:ListBucket\"],
      \"Resource\": [
        \"arn:aws:s3:::${BUCKET}\",
        \"arn:aws:s3:::${BUCKET}/*\"
      ]
    }]
  }"

echo "=== Step 6: Create instance profile and attach role ==="
aws iam create-instance-profile --instance-profile-name "$PROFILE_NAME"
aws iam add-role-to-instance-profile \
  --instance-profile-name "$PROFILE_NAME" \
  --role-name "$ROLE_NAME"

echo "=== Step 7: Attach instance profile to EC2 ==="
aws ec2 associate-iam-instance-profile \
  --instance-id "$INSTANCE_ID" \
  --iam-instance-profile Name="$PROFILE_NAME" \
  --region "$REGION"

echo ""
echo "=== Done ==="
echo "S3 bucket: s3://${BUCKET}"
echo "IAM role: ${ROLE_NAME} (attached to ${INSTANCE_ID})"
echo "No access keys on the instance — uses instance profile credential chain."
echo ""
echo "Next steps on EC2:"
echo "  1. chmod +x /opt/mundial-poker/scripts/backup-db.sh"
echo "  2. Run manually to test: /opt/mundial-poker/scripts/backup-db.sh"
echo "  3. Schedule cron:"
echo "     (crontab -l; echo \"0 3 * * * /opt/mundial-poker/scripts/backup-db.sh >> /var/log/mundial-poker-backup.log 2>&1\") | crontab -"
