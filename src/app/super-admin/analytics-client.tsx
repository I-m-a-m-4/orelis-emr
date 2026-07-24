
'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart as ReAreaChart,
  BarChart as ReBarChart,
  PieChart as RePieChart,
  XAxis,
  YAxis,
  Area,
  Bar,
  Pie,
  Cell,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface AnalyticsClientProps {
  submissionsOverTime: { date: string; count: number }[];
  subscriptionDistribution: { name: string; value: number }[];
  statusDistribution: { name: string; value: number }[];
  countryDistribution: { name: string; value: number }[];
}

export default function AnalyticsClient({
  submissionsOverTime,
  subscriptionDistribution,
  statusDistribution,
  countryDistribution,
}: AnalyticsClientProps) {

  const chartDataFormatter = (number: number) =>
    `${Intl.NumberFormat('us').format(number).toString()}`;

  const PLAN_COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#ef4444"];
  const STATUS_COLORS = ["#10b981", "#f59e0b", "#ef4444"];
  const COUNTRY_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#ef4444", "#64748b"];

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent * 100 < 5) return null;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={14}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload, label, formatter }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/80 backdrop-blur-sm p-3 border rounded-lg shadow-lg" style={{ zIndex: 1000 }}>
          <p className="text-sm font-bold mb-1">{label}</p>
          {payload.map((pld: any, index: number) => (
             <p key={index} className="text-sm" style={{ color: pld.color || pld.fill }}>
                {`${pld.name}: ${formatter ? formatter(pld.value) : pld.value}`}
             </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>New Patient Registrations Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ReAreaChart
                data={submissionsOverTime}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5}/>
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickMargin={10} />
                <YAxis tickFormatter={chartDataFormatter} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip content={<CustomTooltip formatter={chartDataFormatter} />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.3}
                  name="Patients"
                />
              </ReAreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Subscription Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-4">
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie
                  data={subscriptionDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  innerRadius={50}
                  label={renderCustomLabel}
                  labelLine={false}
                  paddingAngle={5}
                >
                  {subscriptionDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PLAN_COLORS[index % PLAN_COLORS.length]} stroke={""} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip formatter={chartDataFormatter} />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </RePieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Subscription Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RePieChart>
                  <Pie data={statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={renderCustomLabel} labelLine={false}>
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip formatter={chartDataFormatter} />} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </RePieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Clinics by Country</CardTitle>
            </CardHeader>
            <CardContent>
               <ResponsiveContainer width="100%" height={300}>
                 <ReBarChart data={countryDistribution} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickMargin={10} />
                    <YAxis tickFormatter={chartDataFormatter} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip content={<CustomTooltip formatter={chartDataFormatter} />} cursor={{fill: 'rgba(120, 120, 120, 0.1)'}}/>
                    <Bar dataKey="value" name="Clinics" radius={[4, 4, 0, 0]}>
                        {countryDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COUNTRY_COLORS[index % COUNTRY_COLORS.length]} />
                        ))}
                    </Bar>
                </ReBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
