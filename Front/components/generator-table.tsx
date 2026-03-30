"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Filter, 
  Zap, 
  AlertTriangle,
  Activity,
  TrendingDown,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { getAuthHeaders, API_URL, apiFetch } from "@/lib/api"

const ITEMS_PER_PAGE = 50

// Helper to get dates for default range (today to one week ago)
function getDefaultDateRange() {
  const today = new Date()
  const oneWeekAgo = new Date(today)
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  
  const formatDate = (d: Date) => d.toISOString().split("T")[0]
  return {
    startDate: formatDate(oneWeekAgo),
    endDate: formatDate(today),
  }
}

// Validate date range doesn't exceed one week
function validateDateRange(start: string, end: string): { valid: boolean; message?: string } {
  if (!start || !end) return { valid: true }
  
  const startDate = new Date(start)
  const endDate = new Date(end)
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays > 7) {
    return { valid: false, message: "Date range cannot exceed 7 days" }
  }
  return { valid: true }
}

const GENERATOR_OPTIONS = ["1", "2", "3", "4"] as const

interface GeneratorNuclearOutage {
  period: string
  facilityId: number | null
  facilityName: string | null
  generatorName: string | null
  capacity: number | null
  outage: number | null
  percentOutage: number | null
}

interface Facility {
  facilityId: number
  facilityName: string
}

interface PaginatedResponse {
  total: number
  page: number
  page_size: number
  results: GeneratorNuclearOutage[]
}

function getOutageSeverity(percent: number | null): { label: string; className: string } {
  if (percent === null) return { label: "N/A", className: "bg-muted text-muted-foreground" }
  if (percent <= 5) return { label: "Low", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" }
  if (percent <= 15) return { label: "Moderate", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20" }
  if (percent <= 25) return { label: "High", className: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20" }
  return { label: "Critical", className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20" }
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subtext,
  iconClassName 
}: { 
  icon: React.ElementType
  label: string
  value: string | number
  subtext?: string
  iconClassName?: string
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
          {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
        </div>
        <div className={`rounded-lg p-2.5 ${iconClassName}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

const TABLE_COLUMNS = [
  { label: "Period",        className: "" },
  { label: "Facility",      className: "text-right" },
  { label: "Facility Name", className: "text-right" },
  { label: "Generator",     className: "text-right" },
  { label: "Capacity (MW)", className: "text-right" },
  { label: "Outage (MW)",   className: "text-right" },
  { label: "% Outage",      className: "text-right" },
] as const

export function GeneratorTable() {
  // Get default date range (today to one week ago)
  const defaultDates = useMemo(() => getDefaultDateRange(), [])
  
  const [data,         setData]         = useState<GeneratorNuclearOutage[]>([])
  const [total,        setTotal]        = useState(0)
  const [currentPage,  setCurrentPage]  = useState(1)
  const [isFetching,   setIsFetching]   = useState(false)

  // Date filters — trigger API call (default: one week range)
  const [startDateFilter, setStartDateFilter] = useState(defaultDates.startDate)
  const [endDateFilter,   setEndDateFilter]   = useState(defaultDates.endDate)

  // API filters — these are sent to the API for server-side filtering
  const [facilities,      setFacilities]      = useState<Facility[]>([])
  const [facilityFilter,  setFacilityFilter]  = useState<string>("all")
  const [generatorFilter, setGeneratorFilter] = useState<string>("all")

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (data.length === 0) return null
    const validOutages  = data.filter(d => d.percentOutage !== null)
    const avgOutage     = validOutages.length > 0
      ? validOutages.reduce((acc, d) => acc + (d.percentOutage || 0), 0) / validOutages.length : 0
    const totalCapacity = data.reduce((acc, d) => acc + (d.capacity || 0), 0)
    const totalOutage   = data.reduce((acc, d) => acc + (d.outage   || 0), 0)
    const criticalCount = data.filter(d => (d.percentOutage || 0) > 25).length
    return { avgOutage: avgOutage.toFixed(1), totalCapacity, totalOutage, criticalCount }
  }, [data])



  // ── Fetch facilities once ──────────────────────────────────────────────────
  useEffect(() => {
    apiFetch(`${API_URL}/data/facilities`)
      .then((r) => r.json())
      .then(setFacilities)
      .catch(() => {})
  }, [])

  // ── Fetch data ─────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (
    page: number, 
    dateFrom: string, 
    dateTo: string,
    facility: string,
    generator: string
  ) => {
    setIsFetching(true)
    try {
      const params = new URLSearchParams({
        page:      String(page),
        page_size: String(ITEMS_PER_PAGE),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo   && { date_to:   dateTo   }),
        ...(facility !== "all" && { facility_id: facility }),
        ...(generator !== "all" && { generator_name: generator }),
      })
      const res = await apiFetch(`${API_URL}/data/generator?${params}`)
      if (!res.ok) throw new Error("Failed to fetch data")
      const json: PaginatedResponse = await res.json()
      setData(json.results)
      setTotal(json.total)
    } catch {
      toast.error("Error loading data", { description: "Could not fetch outage data from the API." })
    } finally {
      setIsFetching(false)
    }
  }, [])

  useEffect(() => {
    fetchData(currentPage, startDateFilter, endDateFilter, facilityFilter, generatorFilter)
  }, [currentPage, startDateFilter, endDateFilter, facilityFilter, generatorFilter, fetchData])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleDateChange = useCallback((type: "start" | "end") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    const newStart = type === "start" ? newValue : startDateFilter
    const newEnd = type === "end" ? newValue : endDateFilter
    
    // Validate the new date range
    const validation = validateDateRange(newStart, newEnd)
    if (!validation.valid) {
      toast.error("Invalid date range", { description: validation.message })
      return
    }
    
    if (type === "start") {
      setStartDateFilter(newValue)
    } else {
      setEndDateFilter(newValue)
    }
    setCurrentPage(1)
  }, [startDateFilter, endDateFilter])

  const clearFilters = useCallback(() => {
    const defaults = getDefaultDateRange()
    setStartDateFilter(defaults.startDate)
    setEndDateFilter(defaults.endDate)
    setFacilityFilter("all")
    setGeneratorFilter("all")
    setCurrentPage(1)
  }, [])

  
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)
  const hasFilters = startDateFilter !== defaultDates.startDate || 
                     endDateFilter !== defaultDates.endDate || 
                     facilityFilter !== "all" || 
                     generatorFilter !== "all"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <Zap className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Generator Level Nuclear Outages</h1>
              <p className="text-sm text-muted-foreground">United States — Aggregated daily data</p>
            </div>
          </div>
        </div>
        
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Activity}      label="Average Outage"  value={`${stats.avgOutage}%`}               subtext="Current page"   iconClassName="bg-blue-500/10 text-blue-500" />
          <StatCard icon={Zap}           label="Total Capacity"  value={stats.totalCapacity.toLocaleString()} subtext="Megawatts (MW)" iconClassName="bg-emerald-500/10 text-emerald-500" />
          <StatCard icon={TrendingDown}  label="Total Outage"    value={stats.totalOutage.toLocaleString()}   subtext="Megawatts (MW)" iconClassName="bg-amber-500/10 text-amber-500" />
          <StatCard icon={AlertTriangle} label="Critical Days"   value={stats.criticalCount}                  subtext="> 25% outage"   iconClassName="bg-red-500/10 text-red-500" />
        </div>
      )}

      {/* Main Card */}
      <Card className="overflow-hidden border-border shadow-sm">
        <CardHeader className="border-b border-border bg-muted/30 pb-4">
          <div className="flex flex-col gap-4">

            {/* Row 1 — title + date filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg text-foreground">Outage Records</CardTitle>
<CardDescription>
                  {`${total.toLocaleString()} total records`}
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Date:</span>
                </div>
<div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input type="date" value={startDateFilter}
                    onChange={handleDateChange("start")}
                    className="h-9 w-36 pl-8 text-sm" />
                </div>
                <span className="text-muted-foreground">—</span>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input type="date" value={endDateFilter}
                    onChange={handleDateChange("end")}
                    className="h-9 w-36 pl-8 text-sm" />
                </div>
              </div>
            </div>

            {/* Row 2 — facility + generator + clear */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={facilityFilter} onValueChange={(v) => { setFacilityFilter(v); setCurrentPage(1) }}>
                <SelectTrigger className="h-9 w-52 text-sm">
                  <SelectValue placeholder="All facilities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All facilities</SelectItem>
                  {facilities.map((f) => (
                    <SelectItem key={f.facilityId} value={String(f.facilityId)}>
                      {f.facilityName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

<Select value={generatorFilter} onValueChange={(v) => { setGeneratorFilter(v); setCurrentPage(1) }}>
                <SelectTrigger className="h-9 w-40 text-sm">
                  <SelectValue placeholder="All generators" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All generators</SelectItem>
                  {GENERATOR_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>
                       {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}
                  className="h-9 gap-1 px-2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                  Clear all
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
<TableHeader>
                <TableRow className="border-border bg-muted/50 hover:bg-muted/50">
                  {TABLE_COLUMNS.map(({ label, className }) => (
                    <TableHead
                      key={label}
                      className={`font-semibold text-foreground ${className}`}
                    >
                      {label}
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-semibold text-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isFetching ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32">
                      <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                        <Spinner className="h-6 w-6" />
                        <span className="text-sm">Loading outage data...</span>
                      </div>
                    </TableCell>
                  </TableRow>
) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <AlertTriangle className="h-8 w-8 text-muted-foreground/50" />
                        <span className="font-medium">No data found</span>
                        <span className="text-sm">Try adjusting your filters</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row, idx) => {
                    const severity = getOutageSeverity(row.percentOutage)
                    return (
                      <TableRow
                        key={`${row.period}-${row.facilityId}-${row.generatorName}-${idx}`}
                        className={`border-border transition-colors ${idx % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
                      >
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-amber-500/70" />
                            {row.period}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-foreground">
                          {row.facilityId?.toLocaleString() ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-foreground">
                          {row.facilityName ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-foreground">
                          {row.generatorName ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-foreground">
                          {row.capacity?.toLocaleString() ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-foreground">
                          {row.outage?.toLocaleString() ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-foreground">
                          {row.percentOutage != null ? (
                            <span className={row.percentOutage > 25 ? "font-semibold text-red-600 dark:text-red-400" : ""}>
                              {row.percentOutage}%
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`${severity.className} font-medium`}>
                            {severity.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col items-center justify-between gap-4 border-t border-border bg-muted/30 px-4 py-3 sm:flex-row sm:px-6">
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, total)}</span>
              –<span className="font-medium text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, total)}</span>
              {" "}of{" "}
              <span className="font-medium text-foreground">{total.toLocaleString()}</span> results
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="h-8 gap-1 px-2.5">
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5)                    pageNum = i + 1
                  else if (currentPage <= 3)              pageNum = i + 1
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                  else                                    pageNum = currentPage - 2 + i
                  return (
                    <Button key={pageNum}
                      variant={currentPage === pageNum ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="h-8 w-8 p-0 text-xs">
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              <Button variant="outline" size="sm"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="h-8 gap-1 px-2.5">
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
