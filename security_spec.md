# Security Specification & Test Matrix

## 1. Data Invariants
- User profile documents (`/users/{userId}`) can only be created by the authenticated owner (`request.auth.uid == userId`) and modified by the owner or admin (`bizdev06.tbc@gmail.com`).
- Products (`/products/{productId}`) are readable by anyone (public guest view allowed to see trending marketplace products). Products can only be created or updated by admins.
- Review Submissions (`/reviews/{reviewId}`) must have `incoming().userId == request.auth.uid`. A user can read their own reviews; admins can read all reviews.
- Subscription Payments (`/subscriptions/{subId}`) must have `incoming().userId == request.auth.uid`. Users can read their own payments; admins can read and approve/reject all subscriptions.
- Withdrawals (`/withdrawals/{withdrawalId}`) must have `incoming().userId == request.auth.uid`. Users can create requests and view their own; admins manage payout statuses.
- Platform Settings (`/settings/{settingId}`) are readable by all authenticated users (to view admin payment QR / UPI / Bank details) and can only be updated by admins.

## 2. The Dirty Dozen Payloads (Negative Tests)
1. Impersonate user profile creation with mismatched UID.
2. Direct modification of another user's wallet balance.
3. Guest write to products collection.
4. User modifying product catalog or prices.
5. Review submission with spoofed userId.
6. Review with oversized reviewText (>2000 chars).
7. Non-admin editing admin payment settings.
8. Unauthorized user reading another user's withdrawal request.
9. Modifying approved status of a completed subscription payment by non-admin.
10. Unauthenticated read of user private payout records.
11. Injecting malicious keys/scripts into subscription payment record.
12. Denial of wallet attack via 1MB string into product ID or user path.
