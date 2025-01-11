FROM debian:bookworm-20231009

ARG UID=5988
ARG GID=5988

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

ENV PRANKWEB_DATA_PREDICTIONS="/data/prankweb/predictions/"
ENV PRANKWEB_DATA_DOCKING="/data/prankweb/docking/"
ENV PRANKWEB_DATA_TUNNELS="/data/prankweb/tunnels/"

RUN apt-get update \
  && apt-get -y --no-install-recommends install \
  wget curl \
  python3 python3-pip python3-venv \
  vim

# https://github.com/python/cpython/issues/102134
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

RUN addgroup --gid ${GID} user \
  && useradd --uid ${UID} --gid ${GID} user

WORKDIR /opt/web-server
COPY --chown=user:user ./web-server/src ./src/
COPY --chown=user:user ./web-server/wsgi.py ./
COPY --chown=user:user ./web-server/requirements.txt ./

RUN pip3 install -r requirements.txt

USER ${UID}:${GID}

EXPOSE 8020

CMD ["gunicorn" ,"-w", "4", "-b", ":8020 ", "wsgi:app"]
