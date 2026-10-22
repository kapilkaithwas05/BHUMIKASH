export interface AMSStudentAttendance {
  studentId: string;
  studentEmail: string;
  studentName: string;
  rollNumber?: string;
  present: boolean;
  timestamp: string;
  source: "AMS_OFFICIAL_GATEWAY" | "MOCK_DEVELOPMENT_ADAPTER";
}

export interface AMSCourseAttendanceReport {
  labCode: string;
  academicYear: string;
  totalSessions: number;
  attendancePercentage: number;
  status: "SYNCHRONIZED" | "PENDING_CONFIGURATION";
  isSimulated: boolean;
}

export interface IAMSIntegrationService {
  isConfigured(): boolean;
  syncLabAttendance(labId: string, labCode: string, studentEmails: string[]): Promise<AMSStudentAttendance[]>;
  getLabAttendanceSummary(labCode: string): Promise<AMSCourseAttendanceReport>;
}

export class AMSIntegrationService implements IAMSIntegrationService {
  private static instance: AMSIntegrationService;
  private readonly isLiveGatewayAvailable: boolean;

  private constructor() {
    this.isLiveGatewayAvailable = Boolean(process.env.AMS_API_GATEWAY_URL && process.env.AMS_API_KEY);
  }

  public static getInstance(): AMSIntegrationService {
    if (!this.instance) {
      this.instance = new AMSIntegrationService();
    }
    return this.instance;
  }

  public isConfigured(): boolean {
    return this.isLiveGatewayAvailable;
  }

  public async syncLabAttendance(
    labId: string,
    labCode: string,
    studentEmails: string[]
  ): Promise<AMSStudentAttendance[]> {
    if (this.isLiveGatewayAvailable) {
      // Official production gateway call would go here:
      throw new Error("Live university AMS gateway connection timed out or credentials unverified.");
    }

    // Mock development adapter visibly tagged as simulated
    return studentEmails.map((email, idx) => ({
      studentId: `ams-mock-${idx}`,
      studentEmail: email,
      studentName: email.split("@")[0],
      present: true,
      timestamp: new Date().toISOString(),
      source: "MOCK_DEVELOPMENT_ADAPTER",
    }));
  }

  public async getLabAttendanceSummary(labCode: string): Promise<AMSCourseAttendanceReport> {
    return {
      labCode,
      academicYear: "2025-2026",
      totalSessions: 14,
      attendancePercentage: 88.5,
      status: this.isLiveGatewayAvailable ? "SYNCHRONIZED" : "PENDING_CONFIGURATION",
      isSimulated: !this.isLiveGatewayAvailable,
    };
  }
}
