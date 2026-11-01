import { getAccessToken } from './workspaceAuth';
import { apiFetch } from './apiConfig';

export interface SlideContent {
  title: string;
  subtitle?: string;
  bullets?: string[];
  themeColor?: string;
}

export interface GeneratedDeckPlan {
  title: string;
  topic: string;
  slides: SlideContent[];
}

export interface SavedPresentationMeta {
  id: string;
  title: string;
  createdAt: string;
  slideCount: number;
  url: string;
}

const SAVED_SLIDES_KEY = 'alya_google_slides_recent_v1';

export const SlidesService = {
  /**
   * Get recently generated presentations list
   */
  getRecentPresentations(): SavedPresentationMeta[] {
    try {
      const data = localStorage.getItem(SAVED_SLIDES_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  },

  /**
   * Save a presentation metadata to recent list
   */
  saveRecentPresentation(meta: SavedPresentationMeta) {
    try {
      const current = this.getRecentPresentations().filter((p) => p.id !== meta.id);
      const updated = [meta, ...current].slice(0, 30);
      localStorage.setItem(SAVED_SLIDES_KEY, JSON.stringify(updated));
    } catch (_) {}
  },

  /**
   * Remove a presentation from local recent list
   */
  removeRecentPresentation(id: string) {
    try {
      const current = this.getRecentPresentations().filter((p) => p.id !== id);
      localStorage.setItem(SAVED_SLIDES_KEY, JSON.stringify(current));
    } catch (_) {}
  },

  /**
   * Create an empty presentation in Google Slides
   */
  async createPresentation(title: string): Promise<{ presentationId: string; title: string }> {
    const token = await getAccessToken();
    if (!token) throw new Error('Authentication required to access Google Slides.');

    const res = await fetch('https://slides.googleapis.com/v1/presentations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: title || 'Alya AI Presentation',
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Failed to create presentation (${res.status})`);
    }

    return await res.json();
  },

  /**
   * Fetch presentation details from Google Slides
   */
  async getPresentation(presentationId: string): Promise<any> {
    const token = await getAccessToken();
    if (!token) throw new Error('Authentication required to access Google Slides.');

    const res = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Failed to fetch presentation (${res.status})`);
    }

    return await res.json();
  },

  /**
   * Build complete presentation with slides and formatting via batchUpdate
   */
  async buildSlideDeck(plan: GeneratedDeckPlan): Promise<SavedPresentationMeta> {
    const token = await getAccessToken();
    if (!token) throw new Error('Authentication required to access Google Slides.');

    // 1. Create base presentation
    const created = await this.createPresentation(plan.title);
    const presentationId = created.presentationId;

    // 2. Build batch requests to populate slides
    const requests: any[] = [];

    // The created presentation starts with 1 blank/title slide (slide 0).
    // Let's customize slide 1 as title slide, then add subsequent slides.
    plan.slides.forEach((slide, index) => {
      const pageId = `alya_slide_${index + 1}_${Date.now().toString(36)}`;
      const titleBoxId = `title_${index + 1}_${Date.now().toString(36)}`;
      const bodyBoxId = `body_${index + 1}_${Date.now().toString(36)}`;

      // Create new slide
      requests.push({
        createSlide: {
          objectId: pageId,
          insertionIndex: index + 1,
          slideLayoutReference: { predefinedLayout: 'BLANK' },
        },
      });

      // Add Title Shape
      requests.push({
        createShape: {
          objectId: titleBoxId,
          shapeType: 'TEXT_BOX',
          elementProperties: {
            pageObjectId: pageId,
            size: { width: { magnitude: 600, unit: 'PT' }, height: { magnitude: 60, unit: 'PT' } },
            transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 40, unit: 'PT' },
          },
        },
      });

      // Insert Title Text
      requests.push({
        insertText: {
          objectId: titleBoxId,
          text: slide.title,
        },
      });

      // Format Title Text
      requests.push({
        updateTextStyle: {
          objectId: titleBoxId,
          style: {
            bold: true,
            fontSize: { magnitude: 22, unit: 'PT' },
            foregroundColor: {
              opaqueColor: { rgbColor: { red: 0.12, green: 0.14, blue: 0.22 } },
            },
          },
          fields: 'bold,fontSize,foregroundColor',
        },
      });

      // Add Body/Bullet Points Box
      const bulletsText = (slide.bullets || []).map((b) => `•  ${b}`).join('\n\n') || slide.subtitle || '';
      if (bulletsText) {
        requests.push({
          createShape: {
            objectId: bodyBoxId,
            shapeType: 'TEXT_BOX',
            elementProperties: {
              pageObjectId: pageId,
              size: { width: { magnitude: 600, unit: 'PT' }, height: { magnitude: 240, unit: 'PT' } },
              transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 110, unit: 'PT' },
            },
          },
        });

        requests.push({
          insertText: {
            objectId: bodyBoxId,
            text: bulletsText,
          },
        });

        requests.push({
          updateTextStyle: {
            objectId: bodyBoxId,
            style: {
              fontSize: { magnitude: 14, unit: 'PT' },
              foregroundColor: {
                opaqueColor: { rgbColor: { red: 0.25, green: 0.28, blue: 0.35 } },
              },
            },
            fields: 'fontSize,foregroundColor',
          },
        });
      }
    });

    // Execute batchUpdate
    if (requests.length > 0) {
      const batchRes = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });
      if (!batchRes.ok) {
        const errBody = await batchRes.json().catch(() => ({}));
        throw new Error(errBody?.error?.message || `Failed to populate slides (${batchRes.status})`);
      }
    }

    const meta: SavedPresentationMeta = {
      id: presentationId,
      title: plan.title,
      createdAt: new Date().toISOString(),
      slideCount: plan.slides.length,
      url: `https://docs.google.com/presentation/d/${presentationId}/edit`,
    };

    this.saveRecentPresentation(meta);
    return meta;
  },

  /**
   * Delete a slide from a presentation (Destructive - requires explicit user confirmation)
   */
  async deleteSlide(presentationId: string, pageObjectId: string): Promise<boolean> {
    const token = await getAccessToken();
    if (!token) throw new Error('Authentication required to access Google Slides.');

    const res = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            deleteObject: {
              objectId: pageObjectId,
            },
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Failed to delete slide (${res.status})`);
    }

    return true;
  },

  /**
   * Generates a slide deck outline using Gemini via Alya's backend
   */
  async generateDeckOutline(
    topic: string,
    slideCount = 5,
    userApiKey?: string,
  ): Promise<GeneratedDeckPlan> {
    const prompt = `Create a professional, engaging Google Slides presentation deck outline for the topic: "${topic}".
Output MUST be valid JSON only (no markdown, no backticks, no other text) with this exact schema:
{
  "title": "Presentation Title",
  "topic": "${topic}",
  "slides": [
    {
      "title": "Slide Title",
      "subtitle": "Short subtitle or context",
      "bullets": [
        "Key point 1 with actionable insight",
        "Key point 2 with clear explanation",
        "Key point 3 with impactful conclusion"
      ]
    }
  ]
}
Include exactly ${slideCount} slides:
Slide 1: Title & Executive Summary
Slide 2 to ${slideCount - 1}: Core content points, analysis, and key takeaways
Slide ${slideCount}: Conclusion & Actionable Next Steps.`;

    const res = await apiFetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: prompt,
        character: 'alya',
        userApiKey,
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to generate slide outline from AI.');
    }

    const data = await res.json();
    const rawReply = data.reply || '';

    // Parse JSON
    const jsonMatch = rawReply.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Fallback structured deck
      return {
        title: topic,
        topic,
        slides: [
          {
            title: topic,
            subtitle: 'Prepared by Alya AI Companion',
            bullets: ['Executive Overview', 'Key Strategic Drivers', 'Next Actions'],
          },
          {
            title: 'Key Objectives',
            bullets: [
              'Define scope and target milestones',
              'Align strategic priorities',
              'Drive measurable execution and results',
            ],
          },
          {
            title: 'Actionable Implementation',
            bullets: [
              'Phase 1: Research and initial rollout',
              'Phase 2: Optimization and scaling',
              'Phase 3: Continuous feedback and monitoring',
            ],
          },
        ],
      };
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: parsed.title || topic,
        topic,
        slides: Array.isArray(parsed.slides) ? parsed.slides : [],
      };
    } catch {
      return {
        title: topic,
        topic,
        slides: [
          {
            title: topic,
            bullets: ['Overview of the initiative', 'Strategic priorities', 'Expected outcomes'],
          },
        ],
      };
    }
  },
};
