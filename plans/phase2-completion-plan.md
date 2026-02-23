# Phase 2 Completion Plan: Persistent Storage & Fleet Monitoring

## Overview
Phase 2 has two remaining items:
1. **Persistent Storage** - S3/Supabase Storage integration (partially complete)
2. **Fleet Monitoring** - Real-time dashboard for CPU/RAM/Traffic across bridge nodes

---

## 1. Persistent Storage Completion

### Current State
- ✅ Database schema (`StorageVolume` model)
- ✅ Supabase storage service with signed URLs
- ✅ API routes for snapshot management
- ✅ Bridge integration for restore/upload

### Missing Components

#### 1.1 Storage UI Components
- [ ] Create `StorageCard.tsx` component to display storage info
- [ ] Add storage section to container detail page
- [ ] Show storage size and last sync timestamp

#### 1.2 Container Integration
- [ ] Add storage status to `ContainerCard.tsx`
- [ ] Display storage volume size when available
- [ ] Show sync indicator (synced/pending/none)

#### 1.3 Manual Snapshot Controls
- [ ] Add "Create Snapshot" button to running containers
- [ ] Add "Restore from Snapshot" option when starting containers
- [ ] Progress indicator for snapshot operations

#### 1.4 Storage Management Page
- [ ] Create `/dashboard/storage` page
- [ ] List all storage volumes by agent
- [ ] Show total storage usage per user
- [ ] Allow deletion of old snapshots

---

## 2. Fleet Monitoring Dashboard

### Architecture
```
Bridge Server --> POST /api/fleet/stats --> Platform DB --> Dashboard UI
     |                                              |
     |--- Docker stats collection                  |--- Real-time polling
     |--- CPU/RAM/Traffic metrics                  |--- Historical charts
```

### Components to Build

#### 2.1 Backend
- [ ] Add `FleetStats` model to Prisma schema
- [ ] Create `/api/fleet/stats` endpoint for bridge to report
- [ ] Create `/api/fleet/metrics` endpoint for dashboard queries
- [ ] Add stats collection to bridge server (periodic Docker stats)

#### 2.2 Frontend
- [ ] Create `/dashboard/fleet` page (admin-only or public transparency)
- [ ] Add `FleetOverview.tsx` component with:
  - Total containers running
  - Aggregate CPU usage
  - Aggregate RAM usage
  - Network I/O
- [ ] Add `NodeCard.tsx` for individual bridge node stats
- [ ] Add historical charts using recharts or similar

#### 2.3 Bridge Server Updates
- [ ] Add periodic stats collection (every 30 seconds)
- [ ] POST stats to platform endpoint
- [ ] Track per-container metrics

---

## Implementation Order

### Sprint 1: Storage UI (Priority: High)
1. StorageCard component
2. Container detail storage section
3. Manual snapshot controls

### Sprint 2: Fleet Monitoring (Priority: Medium)
1. FleetStats schema and API
2. Bridge stats collection
3. Fleet dashboard page

### Sprint 3: Polish & Testing
1. Storage management page
2. Historical charts
3. Error handling and edge cases

---

## Technical Notes

### Storage Flow
```
User starts container
    --> Check for existing snapshot
    --> If exists, restore from Supabase to Docker volume
    --> Container runs with persistent data

User stops container
    --> Snapshot Docker volume
    --> Upload to Supabase
    --> Record metadata in DB
```

### Fleet Stats Flow
```
Bridge server (every 30s)
    --> docker.containerStats() for all running containers
    --> Aggregate CPU, RAM, Network
    --> POST to /api/fleet/stats
    --> Platform stores in FleetStats table
```

---

## Dependencies
- No new npm packages required
- Uses existing Supabase storage bucket
- Uses existing Docker API on bridge

## Testing Checklist
- [ ] Snapshot creation works
- [ ] Snapshot restore works
- [ ] Storage UI displays correctly
- [ ] Fleet stats are collected
- [ ] Dashboard shows real-time data
