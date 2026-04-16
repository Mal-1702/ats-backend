# ATS Application System

## Overview
This repository contains the core components for the Applicant Tracking System (ATS), including the AI-driven ranking backend and the application frontend. 

**Status:** Active Development. Core APIs, asynchronous workers, and data schemas are currently subject to architectural changes and ongoing optimization. This codebase is not yet stabilized for production deployment.


## Architecture
The system utilizes a decoupled architecture comprising:
- **Backend APIs:** Python-based RESTful services handling data ingestion and processing.
- **Asynchronous Pipeline:** Redis-backed worker queues for processing and ranking resumes.
- **Frontend Layer:** React applications managing user interfaces and job creation modules.
- **Storage Layer:** PostgreSQL for relational data and Supabase for persistent object storage.

## Pre-requisites
- Python 3.10+
- Node.js 18+
- PostgreSQL
- Redis (CELERY)

##Note :- Still in developing state will provide actual data soon 

