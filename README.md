# CS499 - Culminating Experience 

**Project:** Travlr Getaways Administrative Portal  
**Artifact:** User Management & Authentication Module  

---

## 1. Artifact Description

This artifact is the **System User Management Module** for the *Travlr Getaways* full-stack web application. Built using an Angular single-page frontend connected to a Node.js/Express REST API and MongoDB backend, the module serves as the administrative control hub for platform access. 

Originally created during CS-465 (Full Stack I), the module provides complete CRUD functionality for managing administrative and editor access across the application:
* **Account Creation:** Secure creation of user credentials with designated roles.
* **Filter & Search:** Real-time filtering by search query or role (`Admin` vs. `Editor`).
* **Interactive Account Editing:** In-line editing of account privileges and operational status (`Active` vs. `Inactive`).
* **Account Removal:** Secure deletion workflows with administrative safety prompts.

---

## 2. Justification for ePortfolio

I selected this artifact for inclusion in my ePortfolio because it showcases my ability to design, refactor, and implement modern full-stack application interfaces using industry-standard architecture patterns. 

### Key Technical Competencies Demonstrated:
* **Modern Angular State Management:** Utilized Angular Signals (`signal`, `computed`) to manage reactive user filters, selection states, and form inputs smoothly without excessive boilerplate.
* **Component-Driven UI/UX Design:** Refactored a static tabular view into a responsive master-detail pattern with dynamic side panels, improving usability and alignment with existing inventory tools.
* **REST API Integration & Data Binding:** Enhanced payload data flows, handling async HTTP responses cleanly while managing error states and validation feedback directly within the user interface.
* **Host Binding & Reactive DOM Manipulations:** Implemented Angular host bindings (`@HostBinding`, `@HostListener`) for clean component encapsulation and row/card interaction styles.

---

## 3. Course Outcomes & Plan Updates

This enhancement directly aligned with and satisfied the target learning outcomes defined in Module One:

| Planned Outcome | Implementation & Fulfillment |
| :--- | :--- |
| **Demonstrate Software Design Principles** | Applied modular component structures, separating list/card components (`UserCard`) from container layout and state management (`UserListing`). |
| **Implement Robust Full-Stack Workflows** | Enhanced API error handling, signal-driven form resets, and reactive state updates across create/edit operations. |
| **User Experience & Responsive Layouts** | Corrected grid containers and component styles using Bootstrap 5 to deliver a side-by-side master-detail layout across varying screen sizes. |

*Outcome Coverage Updates:* The enhancement verified that edge-case handling—such as null state initializations, conditional form panels, and granular permissions—is critical when demonstrating production-ready applications. No major plan updates were necessary as all targets were satisfied.

---

## 4. Reflection on Enhancement & Learning

Refactoring this artifact was a valuable exercise in converting static visual mockups into clean, reactive frontend components. The primary challenge involved maintaining layout consistency across Bootstrap's grid system while modularizing Angular host elements—specifically preventing nested table/card grid stacking issues and ensuring the details panel remained conditionally hidden until explicit user selection.

Working through these structural layout and state challenges deepened my understanding of Angular's component life cycle, host element behavior, and reactive signal workflows, making me significantly more confident in delivering clean, intuitive web applications.

---

## Tech Stack

* **Frontend:** Angular (Standalone Components, Signals, Reactive Form bindings)
* **Styling:** Bootstrap 5, Custom CSS
* **Backend:** Node.js, Express.js
* **Database:** MongoDB / Mongoose ODM
* **Authentication:** JWT (JSON Web Tokens)
