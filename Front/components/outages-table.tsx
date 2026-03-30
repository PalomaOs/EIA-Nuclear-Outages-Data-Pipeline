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
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Filter, 
  Zap, 
  AlertTriangle,
  Activity,
  TrendingDown,
  X
} from "lucide-react"
import { toast } from "sonner"
import { getAuthHeaders, API_URL, apiFetch } from "@/lib/api"

const ITEMS_PER_PAGE = 50

interface NuclearOutage {
  period: string
  capacity: number | null
  outage: number | null
  percentOutage: number | null
}

interface PaginatedResponse {
  total: number
  page: number
  page_size: number
  results: NuclearOutage[]
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

export function OutagesTable() {
  const [data, setData] = useState<NuclearOutage[]>([])
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [isFetching, setIsFetching] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [startDateFilter, setStartDateFilter] = useState("")
  const [endDateFilter, setEndDateFilter] = useState("")

  // Computed stats
  const stats = useMemo(() => {
    if (data.length === 0) return null
    
    const validOutages = data.filter(d => d.percentOutage !== null)
    const avgOutage = validOutages.length > 0 
      ? validOutages.reduce((acc, d) => acc + (d.percentOutage || 0), 0) / validOutages.length 
      : 0
    
    const totalCapacity = data.reduce((acc, d) => acc + (d.capacity || 0), 0)
    const totalOutage = data.reduce((acc, d) => acc + (d.outage || 0), 0)
    const criticalCount = data.filter(d => (d.percentOutage || 0) > 25).length

    return {
      avgOutage: avgOutage.toFixed(1),
      totalCapacity,
      totalOutage,
      criticalCount
    }
  }, [data])

  // ── Fetch data from /data/US ───────────────────────────────────────────────
  const fetchData = useCallback(async (page: number, dateFrom: string, dateTo: string) => {
    setIsFetching(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(ITEMS_PER_PAGE),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo   && { date_to:   dateTo   }),
      })

      const res = await apiFetch(`${API_URL}/data/US?${params}`,)
      
      if (!res.ok) throw new Error("Failed to fetch data")

      const json: PaginatedResponse = await res.json()
      setData(json.results)
      setTotal(json.total)
    } catch {
      toast.error("Error loading data", {
        description: "Could not fetch outage data from the API.",
      })
    } finally {
      setIsFetching(false)
    }
  }, [])

  // Fetch on mount and when filters/page change
  useEffect(() => {
    fetchData(currentPage, startDateFilter, endDateFilter)
  }, [currentPage, startDateFilter, endDateFilter, fetchData])

  // Reset to page 1 when filters change
  const handleFilterChange = useCallback((setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value)
    setCurrentPage(1)
  }, [])

  const clearFilters = useCallback(() => {
    setStartDateFilter("")
    setEndDateFilter("")
    setCurrentPage(1)
  }, [])

  // ── Refresh ────────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const res = await apiFetch(`${API_URL}/refresh`, {
        method: "POST",
        headers: getAuthHeaders(),
      })

      if (!res.ok) throw new Error("Refresh failed")

      const json = await res.json()

      if (json.records_fetched === 0) {
        toast.info("Already up to date", {
          description: json.message,
        })
      } else {
        toast.success("Data refreshed", {
          description: json.message,
        })
        // Reload table with new data
        fetchData(currentPage, startDateFilter, endDateFilter)
      }
    } catch {
      toast.error("Refresh failed", {
        description: "Could not connect to the API.",
      })
    } finally {
      setIsRefreshing(false)
    }
  }, [currentPage, startDateFilter, endDateFilter, fetchData])

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)
  const hasFilters = startDateFilter || endDateFilter

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
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Nuclear Outages</h1>
              <p className="text-sm text-muted-foreground">United States — Aggregated daily data</p>
            </div>
          </div>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          className="gap-2 shadow-sm"
          size="lg"
        >
          {isRefreshing ? (
            <><Spinner className="h-4 w-4" />Refreshing...</>
          ) : (
            <><RefreshCw className="h-4 w-4" />Refresh Data</>
          )}
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            icon={Activity}
            label="Average Outage"
            value={`${stats.avgOutage}%`}
            subtext="Current page"
            iconClassName="bg-blue-500/10 text-blue-500"
          />
          <StatCard 
            icon={Zap}
            label="Total Capacity"
            value={stats.totalCapacity.toLocaleString()}
            subtext="Megawatts (MW)"
            iconClassName="bg-emerald-500/10 text-emerald-500"
          />
          <StatCard 
            icon={TrendingDown}
            label="Total Outage"
            value={stats.totalOutage.toLocaleString()}
            subtext="Megawatts (MW)"
            iconClassName="bg-amber-500/10 text-amber-500"
          />
          <StatCard 
            icon={AlertTriangle}
            label="Critical Days"
            value={stats.criticalCount}
            subtext="> 25% outage"
            iconClassName="bg-red-500/10 text-red-500"
          />
        </div>
      )}

      {/* Main Card */}
      <Card className="overflow-hidden border-border shadow-sm">
        <CardHeader className="border-b border-border bg-muted/30 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg text-foreground">Outage Records</CardTitle>
              <CardDescription>
                {total.toLocaleString()} total records
                {hasFilters && " (filtered)"}
              </CardDescription>
            </div>
            
            {/* Inline Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filter by date:</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    type="date"
                    value={startDateFilter}
                    onChange={handleFilterChange(setStartDateFilter)}
                    className="h-9 w-36 pl-8 text-sm"
                    placeholder="Start"
                  />
                </div>
                <span className="text-muted-foreground">—</span>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    type="date"
                    value={endDateFilter}
                    onChange={handleFilterChange(setEndDateFilter)}
                    className="h-9 w-36 pl-8 text-sm"
                    placeholder="End"
                  />
                </div>
                {hasFilters && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearFilters}
                    className="h-9 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Clear filters</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold text-foreground">Period</TableHead>
                  <TableHead className="text-right font-semibold text-foreground">Capacity (MW)</TableHead>
                  <TableHead className="text-right font-semibold text-foreground">Outage (MW)</TableHead>
                  <TableHead className="text-right font-semibold text-foreground">% Outage</TableHead>
                  <TableHead className="text-center font-semibold text-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isFetching ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32">
                      <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                        <Spinner className="h-6 w-6" />
                        <span className="text-sm">Loading outage data...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <AlertTriangle className="h-8 w-8 text-muted-foreground/50" />
                        <span className="font-medium">No data found</span>
                        <span className="text-sm">Try adjusting your date filters</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row, idx) => {
                    const severity = getOutageSeverity(row.percentOutage)
                    return (
                      <TableRow 
                        key={row.period} 
                        className={`border-border transition-colors ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
                      >
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-amber-500/70" />
                            {row.period}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-foreground">
                          {row.capacity?.toLocaleString() ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-foreground">
                          {row.outage?.toLocaleString() ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-foreground">
                          {row.percentOutage != null ? (
                            <span className={row.percentOutage > 25 ? 'font-semibold text-red-600 dark:text-red-400' : ''}>
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
              Showing <span className="font-medium text-foreground">{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, total)}</span>
              –<span className="font-medium text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, total)}</span> of{" "}
              <span className="font-medium text-foreground">{total.toLocaleString()}</span> results
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="h-8 gap-1 px-2.5"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="h-8 w-8 p-0 text-xs"
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="h-8 gap-1 px-2.5"
              >
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
