# Build from repo root: docker build -f demo/console/Dockerfile .
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY kit ./kit
COPY agents ./agents
COPY dpdp ./dpdp
COPY connectors ./connectors
COPY demo ./demo
COPY config/cloud-run.client.yaml ./config/cloud-run.client.yaml
COPY config/example.client.yaml ./config/example.client.yaml

RUN mkdir -p credentials output/demo-console output/parity output/migration output/history

ENV PYTHONUNBUFFERED=1
ENV OYDK_CONFIG=config/cloud-run.client.yaml
ENV PORT=8080
ENV OYDK_DEMO_HOST=0.0.0.0

EXPOSE 8080

CMD ["python", "-m", "demo.console.server"]
