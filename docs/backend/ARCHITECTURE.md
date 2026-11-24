# ASCEND — Backend Architecture Specification

**Document Version:** 1.0.0  
**Target Environment:** Python 3.12+ | FastAPI 0.115+ | PostgreSQL 16+ | SQLAlchemy 2.0+ (Async) | Pydantic v2  
**Status:** Approved Architectural Design (Phase 3)  
**Author:** Senior Backend Architect & Database Systems Engineer  

---

## 1. System Overview & Architectural Principles

ASCEND is an AI-powered nutrition, fitness, and athletic performance tracking platform. The frontend is built as a single-page application using React 19, TypeScript, and Tailwind CSS. The backend provides a secure, high-performance, asynchronous RESTful API backed by a normalized PostgreSQL 16 relational database.

### Core Architectural Principles

1. **Separation of Concerns:** Strict decoupling between presentation (HTTP routers), business logic (services), persistence (SQLAlchemy ORM models), data validation (Pydantic schemas), and cross-cutting concerns (authentication, exception handling).
2. **Type Safety & Schema Synchronization:** Full end-to-end type safety from database schemas to Pydantic models and REST API contracts, directly harmonized with the frontend TypeScript interfaces.
3. **Async I/O Concurrency:** Leveraging Python's `asyncio` with FastAPI and SQLAlchemy's `asyncpg` driver to support non-blocking concurrent database transactions and external service integrations.
4. **Relational Data Integrity:** Enforcing domain rules, referential integrity, and cascading behaviors at the database layer (PostgreSQL DDL) rather than relying exclusively on application code.
5. **Vendor-Independent AI Integration:** A modular service adapter layer for AI coaching that supports Google Gemini API with fallback heuristic execution, designed to allow local inference (e.g., Ollama) in future iterations without refactoring core business logic.
6. **Zero Unnecessary Dependencies:** Deliberately avoiding heavyweight frameworks, distributed task queues, external caches (e.g., Redis), or NoSQL databases. The architecture leverages PostgreSQL's native capabilities (JSONB, full-text search, composite indexes, connection pooling) to minimize operational overhead.

---

## 2. Layered Architecture

The backend follows a standard Clean Layered Architecture:

```mermaid
flowchart TD
    Client["React 19 Frontend Client (ascendApiService.ts)"]
    
    subgraph API_Layer ["Presentation & Routing Layer (FastAPI)"]
        Router["API Routers (/api/v1)"]
        Middleware["CORS, Request Logging & Error Middleware"]
        Deps["Dependency Injection (get_db, get_current_user)"]
        PydanticSchemas["Pydantic v2 Request/Response Validation"]
    end

    subgraph Service_Layer ["Business Logic & Service Layer"]
        AuthService["Authentication & Token Service"]
        NutritionService["Nutrition & Target Calculation Service"]
        WorkoutService["Workout & Set Execution Service"]
        ProgressService["Biometrics & Analytics Service"]
        AiCoachService["AI Coach & Heuristic Adapter Service"]
    end

    subgraph Data_Layer ["Data Access & Persistence Layer"]
        SQLAlchemyModels["SQLAlchemy 2.0 ORM Models (Declarative Base)"]
        Alembic["Alembic Migration Engine"]
        SessionPool["AsyncSession / Connection Pool (asyncpg)"]
    end

    subgraph Database ["Physical Storage"]
        PostgresDB[("PostgreSQL 16 Engine")]
    end

    subgraph External ["External AI Providers"]
        GeminiAPI["Google Gemini API (Generative AI)"]
        OllamaLocal["Optional Local Inference (Future)"]
    end

    Client -->|HTTPS / Bearer JWT| Middleware
    Middleware --> Router
    Router --> Deps
    Router --> PydanticSchemas
    Router --> Service_Layer
    Service_Layer --> SQLAlchemyModels
    SQLAlchemyModels --> SessionPool
    SessionPool --> PostgresDB
    Alembic -.->|DDL Versioning| PostgresDB
    AiCoachService -->|Async HTTP / SDK| GeminiAPI
    AiCoachService -.->|Local HTTP| OllamaLocal
```

---

## 3. Directory & File Structure

The project will be organized inside a top-level `backend/` directory structured as follows:

```text
backend/
├── alembic/                         # Database migration environment
│   ├── env.py                       # Migration runner importing Base metadata
│   ├── script.py.mako               # Template for new migration scripts
│   └── versions/                    # Versioned migration scripts (e.g., 001_initial_schema.py)
├── app/
│   ├── __init__.py
│   ├── main.py                      # Application factory, lifespan, CORS, middleware
│   ├── core/                        # Global configuration and core utilities
│   │   ├── __init__.py
│   │   ├── config.py                # Pydantic BaseSettings, environment variables
│   │   ├── security.py              # Argon2id password hashing, JWT encoding/decoding
│   │   ├── database.py              # AsyncEngine, async_sessionmaker, DB session lifecycle
│   │   └── exceptions.py            # Custom application exceptions and global handlers
│   ├── db/                          # Database foundation & seeding
│   │   ├── __init__.py
│   │   ├── base.py                  # DeclarativeBase, Common Mixins (TimestampMixin)
│   │   └── seed_data.py             # ICMR-NIN/USDA foods & default workout templates
│   ├── models/                      # SQLAlchemy 2.0 ORM entities (Table definitions)
│   │   ├── __init__.py              # Barrel export of all models for Alembic discovery
│   │   ├── user.py                  # User, UserRefreshSession, UserProfile, NutritionGoals
│   │   ├── nutrition.py             # FoodItem, Nutrient, FoodNutrient, IntakeRecord
│   │   ├── workout.py               # WorkoutPlan, ExerciseItem, WorkoutSession, ExerciseSetLog
│   │   ├── progress.py              # ProgressRecord
│   │   └── chat.py                  # ChatConversation, ChatMessage
│   ├── schemas/                     # Pydantic v2 schemas (Request/Response validation)
│   │   ├── __init__.py
│   │   ├── auth.py                  # Token, TokenPayload, UserLogin, UserRegister
│   │   ├── user.py                  # UserRead, UserProfileUpdate, NutritionGoalsUpdate
│   │   ├── nutrition.py             # FoodItemRead, IntakeRecordCreate, DailyIntakeSummary
│   │   ├── workout.py               # WorkoutPlanRead, SessionCreate, SetLogUpdate
│   │   ├── progress.py              # ProgressRecordCreate, ProgressAnalytics
│   │   └── chat.py                  # ChatMessageCreate, CoachResponse, StructuredInsight
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── api.py               # Main v1 router aggregating all domain endpoints
│   │       ├── deps.py              # Injected dependencies: get_db, get_current_user
│   │       └── endpoints/
│   │           ├── __init__.py
│   │           ├── auth.py          # /api/v1/auth (register, token, refresh, me)
│   │           ├── users.py         # /api/v1/users (profile, pathway-switch, goals)
│   │           ├── foods.py         # /api/v1/foods (search, custom food creation)
│   │           ├── intake.py        # /api/v1/intake (daily logs, portion scaling, delete)
│   │           ├── workouts.py      # /api/v1/workouts (plans, sessions, set logs)
│   │           ├── progress.py      # /api/v1/progress (biometrics, weight, adherence)
│   │           └── coach.py         # /api/v1/ai (chat, contextual recommendations)
│   └── services/                    # Encapsulated domain business logic
│       ├── __init__.py
│       ├── auth_service.py          # User registration, authentication, token rotation
│       ├── nutrition_calc.py        # Mifflin-St Jeor formulas, macro splits, portion math
│       ├── intake_service.py        # Intake record transactions, daily aggregation
│       ├── workout_service.py       # Session instantiation, set completion checks
│       └── ai_coach_service.py      # Context aggregation, Gemini API call, heuristic fallback
├── tests/                           # Automated backend test suite
│   ├── __init__.py
│   ├── conftest.py                  # Fixtures: test db engine, async test client, seed fixtures
│   ├── test_auth.py                 # Registration, login, token refresh, invalid credentials
│   ├── test_nutrition.py            # Portion math, intake logging, daily summaries
│   ├── test_workouts.py             # Plan retrieval, session creation, set logging
│   └── test_progress.py             # Biometric recording, 28-day window filtering
├── alembic.ini                      # Alembic environment configuration
├── pyproject.toml                   # Project metadata, dependencies, and tool settings
├── .env.example                     # Reference environment variables
└── README.md                        # Backend setup, execution, and testing guide
```

---

## 4. Module Responsibilities & Core Component Design

### 4.1 Application Entrypoint (`app/main.py`)

- **Lifespan Management (`@asynccontextmanager`):** Initializes the async database connection pool on startup and verifies database connectivity with a lightweight `SELECT 1` probe. Safely closes connection pools during shutdown.
- **CORS Configuration:** Restricts allowed origins strictly to the frontend dev server (`http://localhost:3000`, `http://127.0.0.1:3000`) and production origins, supporting `Authorization` headers and standard HTTP verbs (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`).
- **Global Error Handling:** Registers global exception handlers for `RequestValidationError` (Pydantic 422), `SQLAlchemyError` (DB 500), and custom `AscendAppException` classes.
- **Router Mounting:** Mounts the aggregated API router under prefix `/api/v1`.

### 4.2 Configuration Management (`app/core/config.py`)

Implemented via Pydantic's `BaseSettings` reading from `.env` files:

```python
class Settings(BaseSettings):
    PROJECT_NAME: str = "ASCEND Nutrition & Fitness API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: PostgresDsn = "postgresql+asyncpg://postgres:postgres@localhost:5432/ascend_db"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    DATABASE_POOL_PRE_PING: bool = True
    
    # Security & JWT
    SECRET_KEY: str  # 256-bit cryptographically secure string
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # AI Integration (Optional Gemini API Key)
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-1.5-flash"
    
    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
```

### 4.3 Database Engine & Session Lifecycle (`app/core/database.py`)

- **AsyncEngine:** Uses `create_async_engine` from SQLAlchemy with the `asyncpg` driver.
- **Session Factory:** `async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False, autoflush=False)`.
- **Dependency Injection (`get_db`):**
  Yields an `AsyncSession` per request with an explicit `try ... finally` block, ensuring automatic rollback on unhandled exceptions and deterministic resource cleanup:

```python
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

### 4.4 Declarative Base & Common Mixins (`app/db/base.py`)

All ORM models inherit from a common `Base(DeclarativeBase)` class. Shared temporal attributes are captured via a reusable mixin:

```python
class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
```

### 4.5 Dependency Injection Architecture (`app/api/v1/deps.py`)

FastAPI's dependency injection system guarantees clean, testable boundaries:
1. `get_db`: Provides a transactional `AsyncSession`.
2. `get_current_user`: Extracts the Bearer JWT token from the `Authorization` header, decodes the subject (`user_id`), validates expiration, queries the database for the active `User` record, and injects the authenticated entity.
3. `get_current_active_user`: Verifies that the user account is not disabled or deactivated.

### 4.6 Exception Handling Architecture (`app/core/exceptions.py`)

Custom exceptions inherit from `AscendAppException`:
- `EntityNotFoundException` (HTTP 404): Raised when food, workout, or intake record is missing.
- `AccessForbiddenException` (HTTP 403): Raised when a user attempts to read or mutate another user's private record.
- `DuplicateEntityException` (HTTP 409): Raised on email collisions.
- `ValidationFailedException` (HTTP 422): Raised for invalid domain rule transitions (e.g., negative calorie targets).

Standard JSON error envelope:
```json
{
  "error": {
    "code": "ENTITY_NOT_FOUND",
    "message": "Intake record with ID '...' not found.",
    "details": null
  }
}
```

---

## 5. Technology Selection Rationale

| Layer | Chosen Technology | Rationalization |
| :--- | :--- | :--- |
| **Framework** | **FastAPI** | Native asynchronous concurrency, high throughput, automatic OpenAPI (Swagger) generation, and native integration with Pydantic v2. |
| **Database** | **PostgreSQL 16** | Robust relational ACID guarantees, powerful constraints, foreign keys, JSONB support for semi-structured metadata, and `pg_trgm` extension for fuzzy food searching. |
| **ORM** | **SQLAlchemy 2.0** | Modern 2.0 mapped typing (`Mapped[...]`, `mapped_column[...]`), full async engine support with `asyncpg`, composable SQL expressions, and mature ecosystem. |
| **Data Validation** | **Pydantic v2** | Rust-based core providing sub-millisecond serialization, strict typing, and direct synchronization with TypeScript interfaces. |
| **Migrations** | **Alembic** | Industry-standard declarative schema migrations, version-controlled DDL evolution, and autogenerate support. |
| **Hashing** | **Argon2id** | Winner of the Password Hashing Competition; immune to GPU-assisted brute force attacks, superior to legacy bcrypt and PBKDF2. |
| **AI Provider** | **Google Gemini API** | Modern multivariable generative model for conversational nutrition coaching, wrapped behind an internal service interface with fallback heuristics. |

---

## 6. Testing Strategy

1. **Unit Testing:** Validates pure business logic (Mifflin-St Jeor calculations, portion scaling ratios, macro distribution algorithms) without database dependencies.
2. **Integration Testing:** Uses `pytest-asyncio` with an isolated PostgreSQL test database (or in-memory SQLite with async support) to test API routes, transaction rollbacks, foreign key cascades, and authentication guards.
3. **Contract Testing:** Automated verification comparing Pydantic JSON schemas against the frontend's `ascendApiService.ts` payloads.
