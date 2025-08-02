import { useState, useEffect } from 'react';
import { Play, Clock, User, TrendingUp, Award, BookOpen, FileText, Eye, ArrowRight } from 'lucide-react';
import { getQuizSessions, QuizSession } from '../services/quizDatabase';
import { generateVideoSummary } from '../services/aiSummaryService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface DashboardProps {
  onBackToGenerator: () => void;
  onViewQuiz?: (sessionId: string) => void;
  onShowUserProgress?: () => void;
}

const Dashboard = ({ onBackToGenerator, onViewQuiz, onShowUserProgress }: DashboardProps) => {
  const [quizSessions, setQuizSessions] = useState<QuizSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<QuizSession | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadQuizSessions = async () => {
      try {
        const sessions = await getQuizSessions();
        setQuizSessions(sessions);
      } catch (error) {
        console.error('Failed to load quiz sessions:', error);
        toast({
          title: "Error loading sessions",
          description: "Failed to load your quiz sessions. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadQuizSessions();
  }, [toast]);

  const totalQuizzes = quizSessions.length;
  const averageScore = quizSessions.length > 0 
    ? Math.round(quizSessions.reduce((acc, session) => acc + (session.completionPercentage || 0), 0) / quizSessions.length)
    : 0;
  const totalCorrectAnswers = quizSessions.reduce((acc, session) => acc + (session.correctAnswers || 0), 0);
  const hoursLearned = Math.round(quizSessions.reduce((acc, session) => {
    if (!session.videoDuration) return acc;
    
    const parts = session.videoDuration.split(':');
    let totalMinutes = 0;
    
    if (parts.length === 2) {
      totalMinutes = parseInt(parts[0]) + parseInt(parts[1]) / 60;
    } else if (parts.length === 3) {
      totalMinutes = parseInt(parts[0]) * 60 + parseInt(parts[1]) + parseInt(parts[2]) / 60;
    }
    
    return acc + totalMinutes;
  }, 0) / 60 * 10) / 10;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    if (diffDays <= 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getScoreVariant = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  const handleViewSummary = async (session: QuizSession) => {
    try {
      setSelectedSession(session);
      setShowSummary(true);
      setSummaryLoading(true);
      
      if (session.transcript) {
        const summary = await generateVideoSummary(session.transcript, session.videoTitle);
        setAiSummary(summary);
        toast({
          title: "Summary generated",
          description: "AI summary has been generated successfully.",
        });
      }
    } catch (error) {
      console.error('Failed to generate summary:', error);
      toast({
        title: "Summary generation failed",
        description: "Failed to generate AI summary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleViewQuiz = (session: QuizSession) => {
    if (onViewQuiz) {
      onViewQuiz(session.id);
      toast({
        title: "Opening quiz",
        description: "Loading quiz details...",
      });
    }
  };

  const handleShowProgress = () => {
    if (onShowUserProgress) {
      onShowUserProgress();
    }
  };

  const closeSummary = () => {
    setSelectedSession(null);
    setShowSummary(false);
    setAiSummary(null);
    setSummaryLoading(false);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your learning dashboard...</p>
        </div>
      </div>
    );
  }

  const statsData = [
    {
      title: "Total Quizzes",
      value: totalQuizzes,
      icon: BookOpen,
      color: "dashboard-purple",
    },
    {
      title: "Average Score",
      value: `${averageScore}%`,
      icon: TrendingUp,
      color: "dashboard-green",
    },
    {
      title: "Correct Answers",
      value: totalCorrectAnswers,
      icon: Award,
      color: "dashboard-blue",
    },
    {
      title: "Hours Learned",
      value: hoursLearned,
      icon: Clock,
      color: "dashboard-orange",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Learning Dashboard</h1>
          <p className="text-muted-foreground">Track your progress and learning achievements</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {onShowUserProgress && (
            <Button
              onClick={handleShowProgress}
              variant="gradient-primary"
              size="lg"
              className="w-full sm:w-auto"
            >
              <TrendingUp className="h-5 w-5" />
              View Progress
            </Button>
          )}
          <Button
            onClick={onBackToGenerator}
            variant="gradient-secondary"
            size="lg"
            className="w-full sm:w-auto"
          >
            Create New Quiz
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className={`p-3 bg-${stat.color}/10 rounded-2xl`}>
                  <stat.icon className={`h-6 w-6 text-${stat.color}`} />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Learning Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Recent Learning Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {quizSessions.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No quizzes yet</h3>
              <p className="text-muted-foreground mb-6">Start your learning journey by creating your first quiz!</p>
              <Button
                onClick={onBackToGenerator}
                variant="gradient-primary"
                size="lg"
              >
                Create Your First Quiz
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {quizSessions.map((session) => (
                <Card key={session.id} className="transition-all duration-200 hover:shadow-md border-border">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      {session.videoThumbnail && (
                        <div className="flex-shrink-0">
                          <img 
                            src={session.videoThumbnail} 
                            alt={session.videoTitle}
                            className="w-20 h-12 object-cover rounded-lg border"
                          />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 
                              className="font-semibold text-foreground text-lg mb-1 truncate cursor-pointer hover:text-primary transition-colors"
                              onClick={() => handleViewQuiz(session)}
                            >
                              {session.videoTitle}
                            </h3>
                            {session.channelTitle && (
                              <p className="text-muted-foreground text-sm flex items-center mb-2">
                                <User className="h-4 w-4 mr-1" />
                                {session.channelTitle}
                              </p>
                            )}
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span className="flex items-center">
                                <Play className="h-4 w-4 mr-1" />
                                {session.videoDuration}
                              </span>
                              <span className="flex items-center">
                                <BookOpen className="h-4 w-4 mr-1" />
                                {session.totalQuestions} questions
                              </span>
                              <span title={new Date(session.createdAt).toLocaleString()}>
                                {formatDate(session.createdAt)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex-shrink-0 text-right space-y-2">
                            {session.completedAt ? (
                              <Badge variant={getScoreVariant(session.completionPercentage)}>
                                {Math.round(session.completionPercentage)}%
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                In Progress
                              </Badge>
                            )}
                            <div className="flex space-x-2">
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewSummary(session);
                                }}
                                variant="dashboard-icon"
                                size="icon"
                                aria-label="View AI Summary"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewQuiz(session);
                                }}
                                variant="dashboard-icon"
                                size="icon"
                                aria-label="View Quiz Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Modal */}
      {showSummary && selectedSession && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-3xl bg-gradient-to-r from-primary to-dashboard-blue bg-clip-text text-transparent">
                  Video Summary & Assessment
                </CardTitle>
                <Button
                  onClick={closeSummary}
                  variant="ghost"
                  size="icon"
                  aria-label="Close"
                  className="rounded-full"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Video Info */}
              <Card className="bg-gradient-to-r from-primary/5 to-dashboard-blue/5">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-foreground mb-2">{selectedSession.videoTitle}</h3>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      {selectedSession.channelTitle}
                    </span>
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {selectedSession.videoDuration}
                    </span>
                    <span className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-1" />
                      {selectedSession.totalQuestions} questions
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* AI Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <span className="mr-2">🤖</span>
                    AI-Generated Video Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {summaryLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Generating AI summary...</p>
                    </div>
                  ) : aiSummary ? (
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium text-foreground mb-2">Key Learning Points:</h5>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                          {aiSummary.keyPoints.map((point: string, index: number) => (
                            <li key={index}>{point}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-medium text-foreground mb-2">Content Overview:</h5>
                        <p className="text-muted-foreground">{aiSummary.overview}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {aiSummary.tags.map((tag: string) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : selectedSession.transcript ? (
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium text-foreground mb-2">Content Overview:</h5>
                        <p className="text-muted-foreground">
                          {selectedSession.transcript.substring(0, 300)}...
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-center py-4">
                      <p>No transcript available for AI summary generation.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Performance Summary */}
              {selectedSession.completedAt && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <span className="mr-2">📊</span>
                      Learning Assessment Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="bg-dashboard-green/10">
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-dashboard-green">
                            {Math.round(selectedSession.completionPercentage)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Overall Score</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-dashboard-blue/10">
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-dashboard-blue">
                            {selectedSession.correctAnswers || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">Correct Answers</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-dashboard-purple/10">
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-dashboard-purple">
                            {selectedSession.totalQuestions}
                          </div>
                          <div className="text-sm text-muted-foreground">Total Questions</div>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="mt-4">
                      <p className="text-muted-foreground text-sm">
                        Completed on {formatDate(selectedSession.completedAt)}. 
                        This assessment included knowledge checks, reflection questions, and practical application scenarios.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-center space-x-4 pt-4">
                <Button
                  onClick={() => handleViewQuiz(selectedSession)}
                  variant="gradient-primary"
                  size="lg"
                >
                  View Detailed Quiz
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button
                  onClick={closeSummary}
                  variant="secondary"
                  size="lg"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Dashboard;