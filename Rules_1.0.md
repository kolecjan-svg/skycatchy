# SKYCATCHY-RULES.md

## Purpose

This document defines mandatory project rules for the SkyCatchy Mobile application.

The Product Requirements Document (PRD.md) defines WHAT must be built.

The RALF Loop document (RALF-LOOP.md) defines HOW the project must be developed.

This document defines additional project constraints and decision-making rules.

---

# Source of Truth

The following document priority applies:

1. PRD.md
2. RALF-LOOP.md
3. SKYCATCHY-RULES.md

If a conflict exists, the higher-priority document wins.

---

# Project Scope

- Implement only features defined in PRD.md.
- Do not introduce new user-facing features without approval.
- Do not remove features defined in PRD.md.
- If requirements are unclear, document assumptions before implementation.

---

# Existing Platform

- SkyCatchy Mobile extends the existing SkyCatchy platform.
- Existing backend systems should be reused whenever possible.
- Existing aggregation logic should be reused whenever possible.
- Existing deal data structure should be reused whenever possible.

The web platform remains the primary business reference.

---

# User Experience

The application must:

- Be mobile-first.
- Be optimized for touch interaction.
- Prioritize speed and simplicity.
- Minimize user effort.
- Focus on deal discovery.

Users should be able to:

- Open the application.
- Find relevant deals quickly.
- Filter results easily.
- Open deals with minimal friction.

---

# Deal Data

Deal information must preserve:

- Original title.
- Original source attribution.
- Original publication date.
- Original content preview.
- Original destination image when available.

Source attribution must always remain visible.

---

# Navigation

Navigation must follow the structure defined in PRD.md:

- Home
- Favorites
- Settings

Additional navigation layers should be avoided unless required by PRD.

---

# Favorites

MVP requirements:

- Favorites are stored locally.
- Favorites must persist between app launches.
- Favorites must be accessible from the dedicated Favorites screen.

Do not implement account synchronization unless required by future requirements.

---

# Authentication

Authentication features must follow the PRD.

Authentication must not block users from browsing deals unless explicitly required by future requirements.

---

# Performance

Prioritize:

- Fast perceived loading
- Smooth scrolling
- Responsive filtering
- Efficient data loading

Avoid unnecessary network requests and unnecessary complexity.

---

# Quality Requirements

All development must follow the RALF Loop process.

Requirements include:

- Feature-based development
- Review after every feature block
- Testing before completion
- Visual validation
- Interaction validation
- Documentation updates

No feature is considered complete until it passes the required RALF review process.

---

# Security

- Do not hardcode secrets.
- Do not expose credentials.
- Use secure communication.
- Follow Supabase security best practices.
- Avoid storing sensitive information unnecessarily.

---

# Maintainability

Prefer:

- Readable code
- Reusable components
- Clear structure
- Consistent naming

Avoid:

- Duplicate logic
- Unnecessary complexity
- Premature optimization

---

# Future Compatibility

Current implementation must not prevent future support for:

- Push notifications
- User accounts
- Favorites synchronization
- Affiliate integrations
- Premium subscriptions
- Additional deal sources

Future extensibility should be considered during architecture decisions.

---

# Final Rule

When making implementation decisions:

1. Follow PRD.md.
2. Follow RALF-LOOP.md.
3. Choose the simplest solution that satisfies both.
4. Prefer maintainability and scalability over short-term shortcuts.

