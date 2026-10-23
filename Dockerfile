FROM python:3.13-slim-trixie
COPY --from=ghcr.io/astral-sh/uv:0.13 /uv /uvx /bin/

ADD . /app

WORKDIR /app

RUN uv sync --locked

CMD ["uv","run","flask","--app","hockey-mchockeyface","run","--host=0.0.0.0"]
