import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, PieChart, ArrowUpRight, Download, RefreshCw, AlertTriangle, BookOpen } from 'lucide-react';
import { LineChart, BarChart, PieChart as RechartsPlot, Line, Bar, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts';

// Sample data - in a real app this would come from actual student focus data
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const ClassroomInsights = ({ classData, isLive }) => {
  const [viewMode, setViewMode] = useState('live');
  const [aggregatedData, setAggregatedData] = useState({
    averageClassFocus: 0,
    attentiveCount: 0,
    distractedCount: 0,
    needsAttentionCount: 0,
    focusOverTime: [],
    studentBreakdown: []
  });
  
  const [needsAttention, setNeedsAttention] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Simulate data processing
  useEffect(() => {
    if (!classData || classData.length === 0) return;
    
    // Process class data
    const processClassData = () => {
      // Calculate average focus across all students
      const totalFocus = classData.reduce((sum, student) => sum + student.focusScore, 0);
      const avgFocus = totalFocus / classData.length;
      
      // Count students by attention state
      const attentive = classData.filter(s => s.attentivenessState === 'attentive').length;
      const distracted = classData.filter(s => s.attentivenessState === 'distracted').length;
      const unknown = classData.filter(s => s.attentivenessState === 'unknown').length;
      
      // Identify students needing attention (lowest focus scores)
      const needsAttentionStudents = [...classData]
        .sort((a, b) => a.focusScore - b.focusScore)
        .filter(student => student.focusScore < 0.4 || student.timeDistracted > 30)
        .slice(0, 3);
      
      // Create student breakdown data for pie chart
      const breakdown = [
        { name: 'Highly Engaged (80-100%)', value: classData.filter(s => s.focusScore >= 0.8).length },
        { name: 'Engaged (60-79%)', value: classData.filter(s => s.focusScore >= 0.6 && s.focusScore < 0.8).length },
        { name: 'Partially Engaged (40-59%)', value: classData.filter(s => s.focusScore >= 0.4 && s.focusScore < 0.6).length },
        { name: 'Disengaged (0-39%)', value: classData.filter(s => s.focusScore < 0.4).length },
      ];
      
      // Add new data point for focus over time
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newTimePoint = { time: timestamp, avgFocus: avgFocus * 100 };
      
      setAggregatedData(prev => ({
        averageClassFocus: avgFocus,
        attentiveCount: attentive,
        distractedCount: distracted,
        needsAttentionCount: needsAttentionStudents.length,
        focusOverTime: [...(prev.focusOverTime || []), newTimePoint].slice(-10), // Keep last 10 points
        studentBreakdown: breakdown
      }));
      
      setNeedsAttention(needsAttentionStudents);
    };
    
    processClassData();
    
    // Set up interval for live mode
    if (isLive && viewMode === 'live') {
      const intervalId = setInterval(processClassData, 10000); // Update every 10 seconds
      return () => clearInterval(intervalId);
    }
  }, [classData, isLive, viewMode]);
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    // In a real app, this would trigger a fresh data pull
    setTimeout(() => setIsRefreshing(false), 1000);
  };
  
  const handleDownloadReport = () => {
    // Generate report text
    const reportText = `
FocusLens Classroom Insights Report
Generated: ${new Date().toLocaleString()}
-------------------------------------

CLASSROOM SUMMARY:
- Total Students: ${classData.length}
- Average Focus Level: ${Math.round(aggregatedData.averageClassFocus * 100)}%
- Attentive Students: ${aggregatedData.attentiveCount} (${Math.round((aggregatedData.attentiveCount / classData.length) * 100)}%)
- Distracted Students: ${aggregatedData.distractedCount} (${Math.round((aggregatedData.distractedCount / classData.length) * 100)}%)

ENGAGEMENT BREAKDOWN:
- Highly Engaged (80-100%): ${aggregatedData.studentBreakdown[0]?.value || 0} students
- Engaged (60-79%): ${aggregatedData.studentBreakdown[1]?.value || 0} students
- Partially Engaged (40-59%): ${aggregatedData.studentBreakdown[2]?.value || 0} students
- Disengaged (0-39%): ${aggregatedData.studentBreakdown[3]?.value || 0} students

STUDENTS NEEDING ATTENTION:
${needsAttention.map(student => 
  `- ${student.name}: Focus ${Math.round(student.focusScore * 100)}%, Distracted for ${student.timeDistracted}s`
).join('\n')}

RECOMMENDATIONS:
- Consider a short active learning exercise to re-engage distracted students
- Check in individually with students showing prolonged distraction
- Current content may be too challenging or not challenging enough based on engagement patterns
    `.trim();

    // Create and download the file
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `classroom-insights-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    
    URL.revokeObjectURL(url);
  };

  // If no data is available yet
  if (!classData || classData.length === 0) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-focus" />
            Classroom Insights
          </CardTitle>
          <CardDescription>Connect with students to view insights</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <div className="p-4 bg-secondary rounded-full mb-4">
            <BookOpen className="h-8 w-8 text-focus opacity-70" />
          </div>
          <h3 className="text-lg font-medium mb-1">No classroom data available</h3>
          <p className="text-muted-foreground text-sm max-w-md">
            Start a class session and invite students to join with the class code to begin monitoring classroom engagement.
          </p>
          <Button variant="outline" className="mt-4">
            Start Class Session
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-focus" />
              Classroom Insights
              {isLive && (
                <span className="ml-2 text-xs px-2 py-0.5 bg-focus-high text-white rounded-full flex items-center">
                  <span className="h-1.5 w-1.5 bg-white rounded-full mr-1 animate-pulse"></span>
                  Live
                </span>
              )}
            </CardTitle>
            <CardDescription>Real-time focus data for {classData.length} students</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={viewMode === 'live' ? "default" : "outline"} 
              className={viewMode === 'live' ? "bg-focus hover:bg-focus/90" : ""}
              size="sm"
              onClick={() => setViewMode('live')}
            >
              Live View
            </Button>
            <Button 
              variant={viewMode === 'summary' ? "default" : "outline"}
              className={viewMode === 'summary' ? "bg-focus hover:bg-focus/90" : ""}
              size="sm"
              onClick={() => setViewMode('summary')}
            >
              Summary
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className={isRefreshing ? "animate-spin" : ""}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'live' ? (
          <div className="space-y-6">
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="shadow-sm bg-secondary/30">
                <CardContent className="p-4">
                  <div className="text-center">
                    <h3 className="text-3xl font-bold mb-1">
                      {Math.round(aggregatedData.averageClassFocus * 100)}%
                    </h3>
                    <p className="text-muted-foreground text-sm">Class Focus</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm bg-green-50 dark:bg-green-900/20">
                <CardContent className="p-4">
                  <div className="text-center">
                    <h3 className="text-3xl font-bold mb-1 text-green-600 dark:text-green-400">
                      {aggregatedData.attentiveCount}
                    </h3>
                    <p className="text-muted-foreground text-sm">Attentive</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm bg-red-50 dark:bg-red-900/20">
                <CardContent className="p-4">
                  <div className="text-center">
                    <h3 className="text-3xl font-bold mb-1 text-red-600 dark:text-red-400">
                      {aggregatedData.distractedCount}
                    </h3>
                    <p className="text-muted-foreground text-sm">Distracted</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm bg-amber-50 dark:bg-amber-900/20">
                <CardContent className="p-4">
                  <div className="text-center">
                    <h3 className="text-3xl font-bold mb-1 text-amber-600 dark:text-amber-400">
                      {aggregatedData.needsAttentionCount}
                    </h3>
                    <p className="text-muted-foreground text-sm">Need Attention</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Main Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Focus Over Time Chart */}
              <Card className="shadow-sm lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">Class Focus Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={aggregatedData.focusOverTime}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="avgFocus"
                          name="Average Focus %"
                          stroke="#8884d8"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Engagement Breakdown */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">Engagement Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPlot>
                        <Pie
                          data={aggregatedData.studentBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {aggregatedData.studentBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPlot>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Students Needing Attention */}
            {needsAttention.length > 0 && (
              <Card className="shadow-sm border-amber-200 dark:border-amber-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-md flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Students Needing Attention
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {needsAttention.map(student => (
                      <div key={student.id} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md">
                        <div className="flex items-center">
                          <div className="bg-amber-100 dark:bg-amber-800 h-8 w-8 rounded-full flex items-center justify-center mr-3">
                            <span className="font-medium text-amber-800 dark:text-amber-200">{student.name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Distracted for {student.timeDistracted}s
                            </p>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center">
                            <span className="text-xs mr-2">Focus:</span>
                            <div className="w-16 h-2 bg-gray-200 rounded-full dark:bg-gray-700">
                              <div 
                                className="h-2 rounded-full bg-amber-500"
                                style={{ width: `${student.focusScore * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-xs ml-2">{Math.round(student.focusScore * 100)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Action Buttons */}
            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={handleDownloadReport}>
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
            </div>
          </div>
        ) : (
          // Summary View
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">Engagement Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={aggregatedData.studentBreakdown}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" name="Students" fill="#8884d8">
                          {aggregatedData.studentBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">Teaching Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 p-2">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                      <h4 className="font-medium mb-1">Engagement Pattern</h4>
                      <p className="text-sm text-muted-foreground">
                        {aggregatedData.averageClassFocus > 0.7 
                          ? "Strong overall engagement. Content appears to be resonating well with the class."
                          : aggregatedData.averageClassFocus > 0.5
                            ? "Moderate engagement. Consider more interactive elements to boost attention."
                            : "Lower than optimal engagement. Consider shifting teaching approach or content difficulty."
                        }
                      </p>
                    </div>
                    
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <h4 className="font-medium mb-1">Recommended Actions</h4>
                      <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                        {aggregatedData.distractedCount > (classData.length * 0.3) && (
                          <li>Take a short break or switch to a group activity</li>
                        )}
                        {needsAttention.length > 0 && (
                          <li>Check in with students showing prolonged distraction</li>
                        )}
                        {aggregatedData.averageClassFocus < 0.5 && (
                          <li>Content may be too difficult or not challenging enough</li>
                        )}
                        <li>Use visual aids to reinforce key concepts</li>
                      </ul>
                    </div>
                    
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <h4 className="font-medium mb-1">Attention Span Alert</h4>
                      <p className="text-sm text-muted-foreground">
                        {aggregatedData.focusOverTime.length > 3 && 
                          aggregatedData.focusOverTime.slice(-3).every((point, i, arr) => 
                            i === 0 || point.avgFocus < arr[i-1].avgFocus)
                          ? "Attention is trending downward. Consider changing pace or introducing new material."
                          : "Attention levels are stable or improving. Current teaching approach is effective."
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={handleDownloadReport}>
                <Download className="h-4 w-4 mr-2" />
                Download Insights Report
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClassroomInsights;