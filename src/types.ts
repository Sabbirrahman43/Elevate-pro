export type TaskCelebration = "70" | "80" | "90" | "100" | "first";

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  date: string;
  createdAt: number;
  habitId?: string;
  tags?: string[];
}

export interface HabitLog { [date: string]: boolean; }

export interface Habit {
  id: string;
  name: string;
  createdAt: number;
  logs: HabitLog;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

export interface AIModel {
  id: string;
  name: string;
  provider: "gemini" | "groq";
  color: string;
}

export type AIPersonaType = "Coach" | "Teacher" | "Trainer" | "Partner" | "Friend" | "Wife" | "Girlfriend";

export interface AISettings {
  identity: {
    name: string;
    persona: AIPersonaType;
    behavior: string;
    avatar?: string;
  };
  voice: {
    selected: string;
    autoplay: boolean;
  };
}

export interface UserProfile {
  name: string;
  dob: string;
  about: string;
  goals: string;
  avatar?: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic: string;
  createdAt: number;
  nextReview?: number;
}

export type AIMode = "Chat" | "Research" | "Support" | "Planner" | "Learner";

export interface WorkspaceData {
  tasks: Task[];
  habits: Habit[];
  notes: Note[];
  messages: ChatMessage[];           // Chat mode messages (default)
  researchMessages: ChatMessage[];   // Research mode
  supportMessages: ChatMessage[];    // Support mode
  plannerMessages: ChatMessage[];    // Planner mode
  learnerMessages: ChatMessage[];    // Learner mode
  flashcards: Flashcard[];           // AI-created flashcards
  offDays: string[];
  settings: {
    geminiKey: string;
    groqKey: string;           //  NEW: Groq API key (free)
    profile: UserProfile;
    ai: AISettings;
    selectedModelId: string;
  };
  practiceQueue: string[];
  history: {
    taskId: string;
    taskText: string;
    timestamp: number;
    duration: number;
    score?: number;
  }[];
  stats: {
    totalSessions: number;
    focusTime: number;
    dailyMarks?: number;
    tokensUsed?: number;
    lastTokenReset?: number;
    quotaLimit?: number;
  };
  lastSync: number;
  hasCompletedOnboarding?: boolean;
  hasDismissedBulletin?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  model?: string;
}
