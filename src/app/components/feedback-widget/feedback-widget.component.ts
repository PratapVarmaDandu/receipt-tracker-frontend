import { Component } from '@angular/core';
import { FeedbackService, SubmissionType } from '../../services/feedback.service';
import { DiagnosticLogService } from '../../services/diagnostic-log.service';
import { LoggerService } from '../../services/logger.service';

interface TypeOption {
  value: SubmissionType;
  label: string;
  icon: string;
  hint: string;
}

const MAX_FILE_SIZE = 5_000_000; // mirrors backend UserSubmissionService cap

const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,.heic,.heif';
const BROAD_ACCEPT = IMAGE_ACCEPT + ',.pdf,.doc,.docx,.xls,.xlsx,.txt';

@Component({
  selector: 'app-feedback-widget',
  templateUrl: './feedback-widget.component.html',
  styleUrls: ['./feedback-widget.component.scss']
})
export class FeedbackWidgetComponent {
  private readonly source = 'FeedbackWidgetComponent';

  readonly typeOptions: TypeOption[] = [
    { value: 'FEEDBACK',   label: 'Feedback',      icon: 'bi-chat-square-text', hint: 'Tell us what you think' },
    { value: 'BUG_REPORT', label: 'Report a Bug',  icon: 'bi-bug',              hint: 'Something not working?' },
    { value: 'IDEA',       label: 'Submit an Idea', icon: 'bi-lightbulb',       hint: 'Suggest a new feature' }
  ];

  open = false;
  type: SubmissionType = 'FEEDBACK';
  message = '';
  file: File | null = null;
  submitting = false;
  submitted = false;
  error: string | null = null;

  constructor(
    private feedbackService: FeedbackService,
    private diagnosticLog: DiagnosticLogService,
    private logger: LoggerService
  ) {}

  get showFilePicker(): boolean {
    return this.type !== 'IDEA';
  }

  get fileAccept(): string {
    return this.type === 'BUG_REPORT' ? IMAGE_ACCEPT : BROAD_ACCEPT;
  }

  get fileHint(): string {
    return this.type === 'BUG_REPORT'
      ? 'Screenshot (image, max 5MB)'
      : 'Attachment (image, PDF or document, max 5MB)';
  }

  openWidget(): void {
    this.open = true;
  }

  close(): void {
    this.open = false;
    if (this.submitted) {
      this.reset();
    }
  }

  selectType(value: SubmissionType): void {
    this.type = value;
    this.error = null;
    if (value === 'IDEA') {
      this.file = null;
    } else if (value === 'BUG_REPORT' && this.file && !this.file.type.startsWith('image/')) {
      // A non-image picked under Feedback isn't valid for a bug report
      this.file = null;
    }
  }

  onFilePick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const picked = input.files && input.files.length > 0 ? input.files[0] : null;
    input.value = '';
    if (!picked) {
      return;
    }
    if (picked.size > MAX_FILE_SIZE) {
      this.error = 'File exceeds the 5MB limit';
      return;
    }
    if (this.type === 'BUG_REPORT' && !picked.type.startsWith('image/')) {
      this.error = 'Bug reports only accept image screenshots';
      return;
    }
    this.error = null;
    this.file = picked;
  }

  removeFile(): void {
    this.file = null;
  }

  submit(): void {
    if (!this.message.trim()) {
      this.error = 'Please enter a message';
      return;
    }
    this.submitting = true;
    this.error = null;
    const clientLog = this.diagnosticLog.capture();

    this.feedbackService.submit(this.type, this.message.trim(), this.file, clientLog).subscribe({
      next: result => {
        this.logger.info(this.source, `Submission saved id=${result.id} type=${result.type}`);
        this.submitting = false;
        this.submitted = true;
      },
      error: err => {
        this.logger.error(this.source, 'Submission failed', err);
        this.submitting = false;
        this.error = err?.error?.error || 'Submission failed — please try again';
      }
    });
  }

  reset(): void {
    this.type = 'FEEDBACK';
    this.message = '';
    this.file = null;
    this.submitting = false;
    this.submitted = false;
    this.error = null;
  }
}
