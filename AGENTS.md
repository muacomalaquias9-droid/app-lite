# Project architecture
- Keep direct and group messages in their existing separate tables and merge them only in the conversations view, because each has distinct membership and message rules.
- Use the existing follows relationship to populate group invitations, because followers and following are already the social graph of record.