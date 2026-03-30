export interface OutageRecord {
  id: string
  facility: string
  generator: string
  startDate: string
  endDate: string
  capacityAffected: number
  status: "active" | "scheduled" | "completed" | "cancelled"
}

export interface ActivityEvent {
  id: string
  type: "outage_started" | "outage_ended" | "maintenance" | "alert"
  message: string
  timestamp: string
  facility?: string
}

export const facilities = [
  "Palo Verde",
  "South Texas",
  "Braidwood",
  "Byron",
  "Calvert Cliffs",
  "Diablo Canyon",
  "McGuire",
  "Catawba",
  "Vogtle",
  "Watts Bar",
]

export const generators = ["Unit 1", "Unit 2", "Unit 3", "Unit 4"]

export const outageData: OutageRecord[] = [
  {
    id: "1",
    facility: "Palo Verde",
    generator: "Unit 2",
    startDate: "2026-03-15",
    endDate: "2026-04-15",
    capacityAffected: 1380,
    status: "active",
  },
  {
    id: "2",
    facility: "South Texas",
    generator: "Unit 1",
    startDate: "2026-03-01",
    endDate: "2026-03-20",
    capacityAffected: 1354,
    status: "completed",
  },
  {
    id: "3",
    facility: "Braidwood",
    generator: "Unit 1",
    startDate: "2026-04-01",
    endDate: "2026-05-01",
    capacityAffected: 1194,
    status: "scheduled",
  },
  {
    id: "4",
    facility: "Byron",
    generator: "Unit 2",
    startDate: "2026-03-10",
    endDate: "2026-03-25",
    capacityAffected: 1164,
    status: "active",
  },
  {
    id: "5",
    facility: "Calvert Cliffs",
    generator: "Unit 1",
    startDate: "2026-02-20",
    endDate: "2026-03-10",
    capacityAffected: 867,
    status: "completed",
  },
  {
    id: "6",
    facility: "Diablo Canyon",
    generator: "Unit 1",
    startDate: "2026-05-01",
    endDate: "2026-06-01",
    capacityAffected: 1122,
    status: "scheduled",
  },
  {
    id: "7",
    facility: "McGuire",
    generator: "Unit 1",
    startDate: "2026-03-18",
    endDate: "2026-04-05",
    capacityAffected: 1158,
    status: "active",
  },
  {
    id: "8",
    facility: "Catawba",
    generator: "Unit 2",
    startDate: "2026-03-22",
    endDate: "2026-04-10",
    capacityAffected: 1129,
    status: "scheduled",
  },
  {
    id: "9",
    facility: "Vogtle",
    generator: "Unit 3",
    startDate: "2026-02-01",
    endDate: "2026-02-28",
    capacityAffected: 1100,
    status: "completed",
  },
  {
    id: "10",
    facility: "Watts Bar",
    generator: "Unit 2",
    startDate: "2026-04-15",
    endDate: "2026-05-15",
    capacityAffected: 1150,
    status: "scheduled",
  },
  {
    id: "11",
    facility: "Palo Verde",
    generator: "Unit 1",
    startDate: "2026-01-15",
    endDate: "2026-02-01",
    capacityAffected: 1380,
    status: "completed",
  },
  {
    id: "12",
    facility: "South Texas",
    generator: "Unit 2",
    startDate: "2026-05-10",
    endDate: "2026-06-10",
    capacityAffected: 1354,
    status: "scheduled",
  },
]

export const recentActivity: ActivityEvent[] = [
  {
    id: "1",
    type: "outage_started",
    message: "Unplanned outage initiated at Palo Verde Unit 2",
    timestamp: "2026-03-26T08:30:00Z",
    facility: "Palo Verde",
  },
  {
    id: "2",
    type: "maintenance",
    message: "Scheduled maintenance completed at South Texas Unit 1",
    timestamp: "2026-03-25T16:45:00Z",
    facility: "South Texas",
  },
  {
    id: "3",
    type: "alert",
    message: "Capacity threshold warning at Byron Unit 2",
    timestamp: "2026-03-25T14:20:00Z",
    facility: "Byron",
  },
  {
    id: "4",
    type: "outage_ended",
    message: "Outage resolved at Calvert Cliffs Unit 1",
    timestamp: "2026-03-25T10:00:00Z",
    facility: "Calvert Cliffs",
  },
  {
    id: "5",
    type: "maintenance",
    message: "Scheduled inspection started at McGuire Unit 1",
    timestamp: "2026-03-24T09:15:00Z",
    facility: "McGuire",
  },
]

export const capacityTrendData = [
  { month: "Jan", capacity: 95200, outages: 2, available: 93800 },
  { month: "Feb", capacity: 95200, outages: 3, available: 91500 },
  { month: "Mar", capacity: 95200, outages: 4, available: 89800 },
  { month: "Apr", capacity: 95200, outages: 2, available: 92600 },
  { month: "May", capacity: 95200, outages: 3, available: 90400 },
  { month: "Jun", capacity: 95200, outages: 1, available: 94100 },
]

export const kpiData = {
  totalOutages: 4,
  activeGenerators: 89,
  capacityAffected: 4902,
  avgOutageDuration: 28,
}
