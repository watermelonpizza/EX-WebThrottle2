<script setup lang="ts">
// What each line, colour and mark on the diagram means. The samples use the
// diagram's own colours, so the key always matches it, in every theme.
</script>

<template>
  <button
    type="button"
    class="key-button"
    popovertarget="diagram-key"
    data-testid="diagram-key-button"
  >
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9,3L3.36,4.9C3.15,4.97 3,5.15 3,5.38V20.5A0.5,0.5 0 0,0 3.5,21L3.66,20.97L9,18.9L15,21L20.64,19.1C20.85,19.03 21,18.85 21,18.62V3.5A0.5,0.5 0 0,0 20.5,3L20.34,3.03L15,5.1L9,3M8,5.45V17.15L5,18.31V6.46L8,5.45M10,5.47L14,6.87V18.53L10,17.13V5.47M19,5.7V17.54L16,18.55V6.86L19,5.7M7.46,6.3L5.57,6.97V9.12L7.46,8.45V6.3M7.46,9.05L5.57,9.72V11.87L7.46,11.2V9.05M7.46,11.8L5.57,12.47V14.62L7.46,13.95V11.8M7.46,14.55L5.57,15.22V17.37L7.46,16.7V14.55Z"
      />
    </svg>
    Key
  </button>

  <div
    id="diagram-key"
    popover
    class="popup diagram-key"
    aria-labelledby="diagram-key-title"
    data-testid="diagram-key"
  >
    <h2 id="diagram-key-title" class="diagram-key__title">
      Key to the diagram
    </h2>

    <dl class="diagram-key__list">
      <div class="diagram-key__item">
        <dt>
          <svg viewBox="0 0 48 16" aria-hidden="true">
            <line class="sample sample--set" x1="2" y1="8" x2="46" y2="8" />
          </svg>
          Set
        </dt>
        <dd>The way the points lie. A train can run here.</dd>
      </div>

      <div class="diagram-key__item">
        <dt>
          <svg viewBox="0 0 48 16" aria-hidden="true">
            <line class="sample sample--unset" x1="2" y1="8" x2="46" y2="8" />
            <line class="sample__gap" x1="14" y1="8" x2="22" y2="8" />
          </svg>
          Set against
        </dt>
        <dd>
          The points lead away from this track. The break by the switch shows
          which way they lie.
        </dd>
      </div>

      <div class="diagram-key__item">
        <dt>
          <svg viewBox="0 0 48 16" aria-hidden="true">
            <line class="sample sample--idle" x1="2" y1="8" x2="46" y2="8" />
          </svg>
          Not reported
        </dt>
        <dd>The Command Station has not said how these points lie yet.</dd>
      </div>

      <div class="diagram-key__item">
        <dt>
          <svg viewBox="0 0 48 16" aria-hidden="true">
            <line class="sample sample--unset" x1="2" y1="8" x2="46" y2="8" />
            <line
              class="sample sample--set sample--dashed"
              x1="2"
              y1="8"
              x2="46"
              y2="8"
            />
          </svg>
          Flashing
        </dt>
        <dd>
          Points moving. The new route flashes, whoever moved them, then stays
          lit.
        </dd>
      </div>

      <div class="diagram-key__item">
        <dt>
          <svg viewBox="0 0 48 16" aria-hidden="true">
            <line
              class="sample sample--occupied"
              x1="4"
              y1="8"
              x2="44"
              y2="8"
            />
            <line
              class="sample__tick sample--occupied"
              x1="4"
              y1="3"
              x2="4"
              y2="13"
            />
            <line
              class="sample__tick sample--occupied"
              x1="44"
              y1="3"
              x2="44"
              y2="13"
            />
          </svg>
          Occupied
        </dt>
        <dd>A sensor sees a train on this stretch of track.</dd>
      </div>

      <div class="diagram-key__item">
        <dt>
          <span class="sample-tag numeric">37025</span>
          Train
        </dt>
        <dd>
          A loco's number, placed from the menu on its name. It stays where you
          put it until you move it.
        </dd>
      </div>

      <div class="diagram-key__item">
        <dt>
          <span class="sample-number numeric">3</span>
          Turnout/point
        </dt>
        <dd>
          Its number, beside its points. Press it to throw or close them; a
          turning ring means it is waiting for the Command Station.
        </dd>
      </div>

      <div class="diagram-key__item">
        <dt>
          <svg viewBox="0 0 48 16" aria-hidden="true">
            <line class="sample sample--set" x1="2" y1="8" x2="40" y2="8" />
            <line
              class="sample__tick sample--set"
              x1="40"
              y1="2"
              x2="40"
              y2="14"
            />
          </svg>
          Buffer stop
        </dt>
        <dd>The end of the track.</dd>
      </div>
    </dl>
  </div>
</template>

<style scoped>
.key-button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: var(--target);
  padding: 0 var(--space-3);

  color: var(--ink-muted);
  background: var(--panel);
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  font-size: var(--text-sm);
  anchor-name: --diagram-key;

  &:hover {
    color: var(--ink);
  }

  .icon {
    font-size: var(--text-lg);
  }
}

.diagram-key {
  width: min(26rem, calc(100vw - 2 * var(--space-3)));
  position-anchor: --diagram-key;
  position-area: top span-right;
}

@supports not (position-area: top) {
  .diagram-key {
    top: 50%;
    left: 50%;
    translate: -50% -50%;
  }
}

.diagram-key__title {
  font-size: var(--text-md);
}

.diagram-key__list {
  /* Each sample is a short stretch of track, about three letters long. */
  --sample: 3em;

  display: grid;
  column-gap: var(--space-3);
  grid-template-columns: auto 1fr;
  margin: 0;
}

/* The sample and its name in one column, what it means in the other; the
   columns line up down the whole key. */
.diagram-key__item {
  display: grid;
  align-items: baseline;
  grid-column: 1 / -1;
  grid-template-columns: subgrid;
  padding: var(--space-2) 0;
  border-top: 1px solid var(--rule);

  dt {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-weight: 600;
  }

  dd {
    margin: 0;
    color: var(--ink-muted);
  }

  svg {
    flex: none;
    width: var(--sample);
    height: 1em;
  }
}

.sample {
  stroke-width: 4;
}

.sample--set {
  stroke: var(--track-set);
}

.sample--unset {
  stroke: var(--track-unset);
}

.sample--idle {
  stroke: var(--track-idle);
}

.sample--occupied {
  stroke: var(--occupied);
}

.sample--dashed {
  stroke-dasharray: 6 5;
}

.sample__gap {
  stroke: var(--raised);
  stroke-width: 8;
}

.sample__tick {
  stroke-width: 3;
}

.sample-tag {
  flex: none;
  min-width: var(--sample);
  padding: var(--space-1);

  color: var(--describer-ink);
  background: var(--describer);
  border-radius: var(--radius);
  font-size: var(--text-xs);
  font-weight: 500;
  line-height: 1;
  text-align: center;
}

.sample-number {
  flex: none;
  width: var(--sample);
  font-size: var(--text-lg);
  line-height: 1;
  text-align: center;
}
</style>
