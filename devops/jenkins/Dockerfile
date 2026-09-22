# syntax=docker/dockerfile:1

# Jenkins ships Java, which the Sonar scanner needs, but nothing else this
# pipeline uses. The class notes install those by hand with `docker exec`, which
# is lost the moment the container is recreated; building them in keeps the
# agent reproducible and under version control.
FROM jenkins/jenkins:lts

USER root

# docker-cli only, not the daemon: the pipeline drives the host's daemon through
# the socket mounted in the compose file.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl gnupg git \
 && install -m 0755 -d /etc/apt/keyrings \
 && curl -fsSL https://download.docker.com/linux/debian/gpg \
      -o /etc/apt/keyrings/docker.asc \
 && chmod a+r /etc/apt/keyrings/docker.asc \
 && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
      > /etc/apt/sources.list.d/docker.list \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y --no-install-recommends docker-ce-cli nodejs \
 && corepack enable \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

# Corepack otherwise prompts for confirmation and hangs a non-interactive build.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# The base image sets JAVA_HOME but leaves its bin out of PATH: Jenkins runs
# java by absolute path, the sonar-scanner a pipeline step invokes does not.
ENV PATH="${JAVA_HOME}/bin:${PATH}"

USER jenkins
