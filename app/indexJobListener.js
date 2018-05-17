/* eslint-disable no-console */
const Bacon = require('baconjs');

const { RabbitHole } = require('./bootstrap');

const SearchClient = require('./../src/searchClient');

const BATCH_SIZE = 20000;
const BUFFER_TIMEOUT_MS = 10000;

RabbitHole.create().then(rabbitHole => Promise.all([
  rabbitHole.createJsonPublisher(process.env.RABBIT_HOLE_EXCHANGE),
  rabbitHole.createJsonConsumer(process.env.RABBIT_HOLE_INDEX_QUEUE, {prefetch: BATCH_SIZE}),
  rabbitHole,
])).then(([publisher, consumer, rabbitHole]) => {
  console.log('Listening...');

  process.once('SIGINT', () => {
    console.log('Closing...');
    rabbitHole.close();
  });

  const searchClient = SearchClient.create();

  const messageStream = Bacon.fromBinder(sink => consumer.consume(({ message }) => sink(message)))
    .doAction(({json: {operation: [action]}}) => console.log(`Will perform bulk ${JSON.stringify(action)}`))
    .bufferWithTimeOrCount(BUFFER_TIMEOUT_MS, BATCH_SIZE);

  messageStream.onValue(messages => {
    const operations = messages.reduce(
      (operations, message) =>
        [
          ...operations,
          ...message.json.operation,
        ],
      []
    );

    searchClient.bulk(operations)
      .then(result => publisher.publish('index-result', result))
      .then(() => console.log('Performed bulk operation. Acking...'))
      .then(() => Promise.all(messages.map(consumer.ack)));
  });
});
