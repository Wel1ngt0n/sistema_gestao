# PLAN: Unified Team Management & AI Integration (Jarvis v3.5)

## 📋 Overview
This plan describes the consolidation of the Team Management module into a single, cohesive experience. The AI (Jarvis) is integrated as a contextual Copilot, providing real-time diagnostics and support directly on the operational screen.

## 🤖 Agents & Roles
| Agent | Role | Focus |
|-------|------|-------|
| `project-planner` | Architect | Task breakdown and system alignment |
| `frontend-specialist` | UI/UX Developer | Implementation of the unified dashboard and premium design |
| `test-engineer` | Quality Assurance | Validation of metrics, UX, and code standards |

## 🛠️ Tech Stack
- **Frontend**: React 18, Tailwind CSS v4, Lucide React
- **Backend**: Python/Flask (AnalystsReportService)
- **Design System**: Industrial Utilitarian (Orange/Amber/Zinc)

---

## 📅 Phase 1: Planning & Analysis (COMPLETED)
- [x] Identify the core metrics (SLA, MRR, Idle, Carga).
- [x] Analyze the "Jarvis Cockpit" logic to be integrated.
- [x] Map navigation changes (remove redundant routes).

## 🎨 Phase 2: Implementation (IN PROGRESS)
- [x] **Core Component**: Create `JarvisCopilot.tsx` with chat and auto-analysis.
- [x] **Unified Layout**: Refactor `TeamDiagnosticsView.tsx` to include:
    - [x] Operational summary cards.
    - [x] MRR Projection Widget.
    - [x] Team Performance Table with AI classification.
    - [x] Bottleneck charts.
    - [x] Jarvis Copilot sidebar.
- [ ] **Aesthetic Refinement**:
    - [ ] Strictly enforce "Purple Ban" (remove all indigo/purple).
    - [ ] Add micro-animations (animate-in, fade-in, scale).
    - [ ] Implement premium typography (font-black, tracking-tight).

## ⚙️ Phase 3: Logic & Data (PENDING)
- [ ] **Data Flow**: Ensure the `JarvisCopilot` correctly reads and interprets the `teamData` passed as props.
- [ ] **Action Items**: Link the "Próximos Passos" block to actual critical items in the state.

## ✅ Phase 4: Validation & Quality (PENDING)
- [ ] **Script Audit**: Fix Unicode encoding issue in `checklist.py` or run manual validation scripts.
- [ ] **Cross-browser Audit**: Verify responsiveness on tablet/desktop.
- [ ] **Final Security Scan**: Run `security_scan.py`.

---

## ⏸️ CHECKPOINT
### User Approval Needed
Does this plan align with your vision of a "single experience"? If YES, we proceed to Phase 2/3 refinement.
