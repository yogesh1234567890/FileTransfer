FROM python:3.9-slim
WORKDIR /usr/src/app


ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

RUN pip install --upgrade pip pipenv

RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc

# RUN python -m venv /opt/venv
# ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
