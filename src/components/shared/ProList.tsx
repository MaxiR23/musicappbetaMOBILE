// src/components/shared/ProList.tsx
import React, { useCallback, useMemo, useRef, useState } from "react";
import { FlatList, FlatListProps, View } from "react-native";

type Props = Omit<FlatListProps<any>, "data" | "renderItem" | "keyExtractor"> & {
  blockSize?: number;
  initialBlocks?: number;
};

export default function ProList({
  children,
  blockSize = 2,
  initialBlocks = 1,
  onEndReachedThreshold = 0.4,
  windowSize = 7,
  maxToRenderPerBatch = 8,
  updateCellsBatchingPeriod = 50,
  removeClippedSubviews = true,
  onEndReached: onEndReachedProp, // <-- tu callback pasa y se invoca
  ...rest
}: Props) {
  const itemsAll = useMemo(() => React.Children.toArray(children).filter(Boolean), [children]);
  const [blocks, setBlocks] = useState(initialBlocks);
  const items = useMemo(
    () => itemsAll.slice(0, Math.min(itemsAll.length, blocks * blockSize)),
    [itemsAll, blocks, blockSize]
  );

  // Gate para que onEndReached pueda volver a disparar tras un nuevo momentum
  const canLoadMoreRef = useRef(true);

  const onMomentumScrollBegin = useCallback(() => {
    canLoadMoreRef.current = true;
  }, []);

  const handleEnd = useCallback(() => {
    if (!canLoadMoreRef.current) return;
    canLoadMoreRef.current = false;

    if (items.length < itemsAll.length) {
      setBlocks((b) => b + 1);        // revela más bloques
    }
    onEndReachedProp?.();             // dispara tu log/callback
  }, [items.length, itemsAll.length, onEndReachedProp]);

  return (
    <FlatList
      data={items}
      renderItem={({ item }) => <View>{item as React.ReactElement}</View>}
      keyExtractor={(_, i) => `pro-${i}`}
      onEndReached={handleEnd}
      onEndReachedThreshold={onEndReachedThreshold}
      onMomentumScrollBegin={onMomentumScrollBegin}
      windowSize={windowSize}
      maxToRenderPerBatch={maxToRenderPerBatch}
      updateCellsBatchingPeriod={updateCellsBatchingPeriod}
      removeClippedSubviews={removeClippedSubviews}
      ListFooterComponent={<View style={{ height: 1 }} />}
      {...rest}
    />
  );
}
