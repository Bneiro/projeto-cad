# Security Specification — Elo Sonoro

## 1. Data Invariants
1. **Identity Integrity**: Every musician profile (`ownerId`), conversation (`creatorId`), message (`senderId`), and session (`hostId`) MUST match `request.auth.uid` on creation and remain immutable on update.
2. **Email Verification Gate**: All authenticated writes require `request.auth.token.email_verified == true`.
3. **PII Isolation**: Public `/musicians/{musicianId}` documents never contain `email`, `phone`, or `address`. Private user PII lives strictly under `/users/{userId}/private/{docId}` readable and writable only by `request.auth.uid == userId`.
4. **Master Gate & Relational Consistency**: Every message under `/conversations/{conversationId}/messages/{messageId}` validates parent conversation existence (`exists(...)`), participant membership (`request.auth.uid in get(...).data.participantIds`), and exact `participantIds` equality so `allow list` never needs `get()`.
5. **Bounded Arrays & String Size Limits**: Every string checks `.size()` bounds; every array (`genres`, `instruments`, `participantIds`) enforces bounded `.size()` and first-element type validation.
6. **Terminal State Locking**: Once a `/sessions/{sessionId}` document reaches `status == 'concluida'` or `status == 'cancelada'`, all further updates are denied; once a `/quickRequests/{requestId}` reaches `status == 'resolvido'`, all further updates are denied.
7. **Temporal Integrity**: `createdAt` and `updatedAt` must equal `request.time` on creation/update respectively.
8. **Quick Request Community Invariant**: `/quickRequests/{requestId}` is PII-free, enforces `authorId == request.auth.uid`, starts at `status == 'aberto'` and `responseCount == 0`, and non-authors can only increment `responseCount` by 1 while setting status to `'aberto'` or `'em_andamento'`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Identity Spoofing on Musician Create**: Setting `ownerId` to another user's UID (`"victim_uid"`).
2. **Shadow Field Injection on Profile Update**: Adding an unexpected `"isVerifiedAdmin": true` ghost field during profile update.
3. **Unverified Email Write**: Attempting to create a musician profile with `email_verified: false`.
4. **Cross-User PII Read**: Authenticated User B trying `get` on `/users/userA/private/profile`.
5. **Orphaned Message Injection**: Creating a message in `/conversations/nonexistent/messages/m1` where parent conversation does not exist.
6. **Non-Participant Message Snooping**: User C (not in `participantIds`) listing or reading messages in `/conversations/c1/messages`.
7. **ID Poisoning (1.5KB ID)**: Creating `/musicians/<1500-char-id>` or invalid characters (`../admin`).
8. **Denial-of-Wallet Oversized Bio**: Creating a musician profile with a 50,000-character `bio` string.
9. **Unbounded Array Exhaustion**: Creating a conversation with 20 `participantIds` (> max 5).
10. **Terminal State Bypass on Session**: Updating a `concluida` session back to `agendada`.
11. **Tiered Participant Escalation on Session**: Non-host participant attempting to overwrite `title` or `meetUri` instead of only `status`.
12. **Client Timestamp Forgery**: Creating a session with `createdAt` set to a past client timestamp instead of `request.time`.
13. **Quick Request Author Hijack**: Non-author trying to edit `title` or mark a `/quickRequests/{id}` as `'resolvido'`, or initializing `responseCount` > 0 on creation.
