const { RabbitHole, NycOpenData } = require('./../bootstrap');

RabbitHole.create().then(rabbitHole => Promise.all([
  rabbitHole.createJsonPublisher(process.env.RABBIT_HOLE_EXCHANGE),
  rabbitHole,
])).then(([publisher, rabbitHole]) => {
  const payloads = [
    ['xml', NycOpenData.TYPES.XML],
    ['soda', NycOpenData.TYPES.SODA],
  ].reduce(
    (payloads, [source, types]) =>
      [
        ...payloads,
        ...Object.values(types).map(type => ({
          type,
          source,
          filter: {}
        })),
      ]
    ,
    []
  );

  return Promise.all(
    payloads.map(payload => publisher.publish('parse.data', payload))
  ).then(() => rabbitHole.close());
});


