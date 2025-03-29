FROM python:3.12-bullseye
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ADD . /app

WORKDIR /app

RUN uv sync --frozen

CMD ["uv","run","flask","--app","hockey-mchockeyface","run","--host=0.0.0.0"]
