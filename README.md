# react-native-fresh-flatlist

Do you need to update FlatList data frequently? Are people constantly complaining that they don't see the most up-to-date information? Try using this component by simply entering data. Refreshing is the responsibility of this component, Get away from data refreshing logic and focus on other things.


## Installation

```sh
npm install react-native-fresh-flatlist
# or
yarn add react-native-fresh-flatlist
```

## Usage


```tsx
function SampleList() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const renderItem = useCallback(
    ({ item, index }: { item: Board; index: number }) => {
      return (
        <Pressable
          style={{ backgroundColor: 'gray', gap: 8, padding: 12 }}
          onPress={() => navigation.navigate('DetailScreen', { item })}
        >
          <View>
            <Text style={{ fontWeight: 'bold' }}>index : {index}</Text>
            <Text>{item.content}</Text>
          </View>

          <Pressable
            onPress={() => {
              // If you want to refresh the page to which the item belongs after changing the status of the item.
              // Example)
              freshFlatListRef.current?.refreshWatching(index);
            }}
          >
            <Text>LIKE!</Text>
          </Pressable>
        </Pressable>
      );
    },
    [navigation]
  );

  const fetchList = useCallback(
    async (fetchInputMeta: FetchInputMeta<T>) => {
      const { fetchPage } = fetchInputMeta;

      // Enter your fetch logic here.
      const response = await fetch(`https://api.example.com/boards?page=${fetchPage}`);
      const data: {
        list: Array<T>;
        isLast: boolean;
      } = await response.json();

      let list: T[] = [];
      if (data && data.list && data.list.length > 0) {
        list = data.list;
      }

      return {
        list: list as Board[],
        isLastPage: data.isLast,
      }
    },
    [category, ownerId, size]
  );

  return (
    <FreshFlatList<T>
      ref={freshFlatListRef}
      isFocused={isFocused}
      fetchList={fetchList}
      renderItem={renderItem}
    />
  )
};
```

## Props

### `FreshFlatListProps<T>`

| Prop           | Type                                                     | Description                                            |
|----------------|----------------------------------------------------------|--------------------------------------------------------|
| `fetchList`    | `(fetchInputMeta: FetchInputMeta<T>) => FetchOutputMeta<T>` | Required. Function to fetch the list data.             |
| `isFocused`    | `boolean`                                    | Optional. refresh watchging list if the screen is focused. |

## fetchList Props

### `FetchInputMeta<T>`

| Prop        | Type                | Description                                                                    |
|-------------|---------------------|--------------------------------------------------------------------------------|
| `fetchType` | `'first' \| 'watching' \| 'end-reached'` | Type of fetch operation.                                                       |
| `fetchPage` | `number`            | Page number to fetch.  When the fetchList function is first executed, it is 1. |
| `previousAllData`      | `T[]`               | Data held by Fresh FlatList before fetchList function was completed.                   |

### `FetchOutputMeta<T>`

| Prop          | Type                | Description                                                                                    |
|---------------|---------------------|------------------------------------------------------------------------------------------------|
| `list`        | `T[]`               | Fetched list data. Calculated cumulatively within FreshFlatList                                |
| `isLastPage`  | `boolean`           | If you enter true in isLastPage, fetch will not occur even if the end of the list is reached.  |

### `FYI`
The base of this component is FlatList, so FlatListProps can be used, but the following props cannot be used.
- **'data'** : Fetch data is being accumulated inside the component.
- **'onEndReached'** : When onEndReached is reached, the fetching logic is used internally.
- **'keyExtractor'** : The key is created internally using page, fetch data, and timestamp.


## Methods

### `FreshFlatListRef`

#### `reset`

Resets the list to the initial state.

#### `refreshWatching`

Refreshes the current page of the list.

| Parameter | Type    | Description                                                                                                                  |
|-----------|---------|------------------------------------------------------------------------------------------------------------------------------|
| `index`   | `number`| Optional. If the index is given, the page containing the index is refreshed. If not, the current watching page is refreshed. |


## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
