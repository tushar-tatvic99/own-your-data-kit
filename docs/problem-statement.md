# CLAIMED --- Problem Statement 3: Own-Your-Data Analytics Kit

**In one line:** Build a kit that moves a company off Google Analytics
onto an open-source analytics stack running on the company's own cloud,
with the migration done mostly by an agent.

## The Problem Today

Companies want full control of their analytics data, and many want to
cut what they pay for analytics platforms. India's DPDP Act adds
pressure: its core obligations on consent, notice and people's data
rights take effect on 12 May 2027 (source).

Open-source tools exist, but few companies switch. The new tool is not
the hard part. Rebuilding every event, conversion, custom field and
report, and then explaining why the numbers don't match the old tool,
takes weeks. It's like moving house: the new house is easy; the packing
and unpacking is the hard part.

## Who Buys This, and Why

  -----------------------------------------------------------------------
  Buyer                               What they care about
  ----------------------------------- -----------------------------------
  Companies paying for GA4 360, Adobe Lower cost over three years
  Analytics, Mixpanel or similar      

  Regulated companies (BFSI,          Full control of their data, and
  healthcare) and data-sensitive      DPDP readiness
  brands                              
  -----------------------------------------------------------------------

**Tatvic's model:** a one-time fee to customise and deploy on the
client's cloud, followed by a maintenance contract.

## What You Must Build

All five parts are required.

### 1. One-Command Deployment

Deploy the full stack on a fresh cloud project in an India region with
one command, including database, backups, updates and monitoring. Anyone
at Tatvic should be able to repeat the deployment for a new client
without the team that built it.

### 2. DPDP-Ready Settings by Default

Call it **"DPDP-ready," never "DPDP compliant"**: compliance depends on
the client's processes, not on a tool. Defaults must include:

-   No tracking until the visitor consents, enforced through a consent
    management platform.
-   Personal data (emails, phone numbers) stripped from URLs and events.
-   Data retention limits that can be configured.
-   A working flow for a person's request to see or delete their data.
-   An audit log of who accessed or changed what.

### 3. GA4 Migration Agent

This is the core of the problem. The agent reads the client's GA4 setup
(events, conversions, custom dimensions, audiences) and their Google Tag
Manager container through the APIs. It then:

-   Builds the matching setup in your chosen stack.
-   Writes the tag changes as a Tag Manager draft for a human to review;
    nothing is published without approval.
-   Lists anything it could not migrate, with the reason.

### 4. Continuous Parity Check

Parity is not a one-time report. Run GA4 and the new stack side by side
and check parity on a schedule: daily during migration, weekly after.

Set a target gap, for example within 5% on users, sessions, key events
and traffic sources. When the target is missed, the agent alerts the
owner, diagnoses the likely cause (a broken tag on a new page, a consent
change, bot filtering, different session rules) and proposes a fix.

Once the client switches GA4 off, parity is checked against the client's
own records, such as orders in their backend or CRM.

### 5. Ready Connectors

Marketers won't leave GA4 if their ad bidding loses conversion data, so
these are required:

-   Conversions sent to Google Ads and Meta (Conversions API).
-   Consent signals from a consent management platform.
-   Export to BigQuery or another warehouse.
-   A Looker Studio (or similar) dashboard.

## Choosing Your Open-Source Stack

### Stack Priority

Based on Tatvic's client base and the clients we will pitch first:

-   **Priority 1: Matomo.** The default for marketing-led and regulated
    clients (BFSI, healthcare, media, e-commerce). It is the closest to
    GA for marketing teams, mature to self-host, and backed by Tatvic's
    existing Matomo experience.
-   **Priority 2: PostHog.** Only for app-led or product-led clients at
    modest traffic, where product analytics matters more than marketing
    reports.

Teams may propose a different stack only if they show it beats Priority
1 on the five tests below for a named client segment. Whatever you use
must pass these five tests, and you must explain your choice in writing
at the demo.

### The Five Tests

  -----------------------------------------------------------------------
  Test                                Why it matters
  ----------------------------------- -----------------------------------
  The self-hosted version handles     Some tools' free self-hosted
  enterprise traffic (millions of     versions are limited. PostHog's own
  events a month)                     docs say its open-source version
                                      runs on a single machine and is
                                      "unlikely to scale past a couple
                                      100ks events without significant
                                      effort" (source).

  The licence allows Tatvic to deploy Otherwise there is no business.
  it for clients and charge for       Some open-source licences also
  maintenance                         require any changes you make to the
                                      tool's core to be shared with the
                                      client.

  Security fixes are released         A maintenance contract promises the
  regularly and the community is      client their tool stays safe.
  active                              

  Tatvic can support it after the     A stack nobody at Tatvic can
  hackathon                           maintain is dead IP.

  One tool, not two                   Two platforms means twice the
                                      maintenance for the same fee.
                                      Combine tools only if you can show
                                      why it's worth it.
  -----------------------------------------------------------------------

### Where Your IP Lives

Your IP is not in the open-source tool itself, but in the deployment
kit, the connectors and the migration agent. Keep those separate from
the tool so they can be pointed at a different stack later.

## Stretch Goals

These earn extra credit. Attempt them only after all five required parts
work.

-   **Bring the history across.** Import past GA4 data from its BigQuery
    export, so the client doesn't start from zero.
-   **Ask your data.** An assistant that answers plain-English questions
    from the new stack's data, for example, "Which campaign drove the
    most sign-ups last month?"
-   **Cost calculator.** A sales tool that compares three-year total
    cost (current tool vs self-hosted, including cloud and maintenance)
    for a given traffic volume.

## Minimum Demo

Your demo must show all of the following:

-   [ ] A live deployment from one command on a fresh cloud project,
    completed in under an hour.
-   [ ] The migration agent run on the hidden GA4 property: the setup it
    built, the Tag Manager draft it wrote, and the list of items it
    could not migrate.
-   [ ] A scheduled parity check running against its target. Judges will
    break one tag during the event; your agent must catch the missed
    target, raise the alert, diagnose the cause and propose the fix.
-   [ ] Tracking stopping when a visitor declines consent, and one
    person's data found and deleted on request.
-   [ ] A conversion reaching a Google Ads or Meta test account.
-   [ ] Your written reasoning for the stack you chose, against the five
    tests.

## Data and Environment

No client data is needed. Tatvic provides:

-   A test website with realistic e-commerce events, a GA4 property and
    a Tag Manager container.
-   Scripted test traffic running from the day of the setup handover, so
    both tools have data for the parity check.
-   A cloud project with credits in an India region.
-   Google Ads and Meta test accounts for the conversion connectors.

### Hidden Test Property

A second GA4 property with a setup your team has never seen. Your
migration agent is judged on how well it handles that property, not the
practice one.