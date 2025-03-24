// File: components/insights/insights-sidebar.tsx
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowUp,
  ArrowDown,
  BarChart,
  PieChart,
  LineChart,
  TrendingUp,
} from "lucide-react";

export function InsightsSidebar() {
  return (
    <Card className="w-full border">
      <CardHeader>
        <CardTitle className="text-xl">Journal Insights</CardTitle>
        <CardDescription>
          Analytics and stats from your journal entries
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="trends">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="mood">Mood</TabsTrigger>
            <TabsTrigger value="topics">Topics</TabsTrigger>
          </TabsList>
          <TabsContent value="trends" className="space-y-4">
            <div className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">Weekly Activity</div>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <div className="h-[160px] flex items-end gap-1">
                {[30, 45, 25, 60, 75, 45, 65].map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-primary/10 hover:bg-primary/20 rounded-t-sm"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
                <div>Sun</div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="mood" className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: "Happy",
                  value: "32%",
                  change: "+5%",
                  icon: ArrowUp,
                  color: "text-green-500",
                },
                {
                  label: "Stressed",
                  value: "18%",
                  change: "-3%",
                  icon: ArrowDown,
                  color: "text-green-500",
                },
                {
                  label: "Relaxed",
                  value: "24%",
                  change: "+2%",
                  icon: ArrowUp,
                  color: "text-green-500",
                },
                {
                  label: "Anxious",
                  value: "14%",
                  change: "-1%",
                  icon: ArrowDown,
                  color: "text-green-500",
                },
              ].map((item, i) => (
                <Card key={i} className="p-3 border">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-2xl font-bold">{item.value}</div>
                  <div className="flex items-center text-xs mt-1">
                    <item.icon className={`h-3 w-3 mr-1 ${item.color}`} />
                    <span className={item.color}>{item.change}</span>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="topics" className="pt-4 space-y-4">
            <div className="space-y-2">
              {[
                { label: "Work", value: "28%", color: "#3b82f6" },
                { label: "Personal", value: "42%", color: "#10b981" },
                { label: "Family", value: "18%", color: "#f59e0b" },
                { label: "Health", value: "12%", color: "#ef4444" },
              ].map((topic, i) => (
                <div key={i} className="flex items-center">
                  <div className="w-24 flex-shrink-0 text-sm">
                    {topic.label}
                  </div>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: topic.value,
                        backgroundColor: topic.color,
                      }}
                    />
                  </div>
                  <div className="w-10 text-right text-sm ml-2">
                    {topic.value}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
